"""Extract a PDF into a private, page-linked review bundle; never invent questions."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

import pdfplumber


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--source-id', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--ocr', action='store_true')
    parser.add_argument('--pipeline-version', default='pdf-v1')
    args = parser.parse_args()
    source = Path(args.input).resolve()
    output = Path(args.output).resolve()
    if source == output:
        raise ValueError('Output must differ from the original PDF')
    if source.suffix.lower() != '.pdf':
        raise ValueError('Input must be a PDF')
    digest = hashlib.sha256()
    with source.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    pages = []
    with pdfplumber.open(source) as document:
        if not 1 <= len(document.pages) <= 200:
            raise ValueError('Process documents of 1-200 pages per bundle')
        for number, page in enumerate(document.pages, 1):
            text = page.extract_text() or ''
            pages.append({'number': number, 'text': text, 'method': 'native' if len(text.strip()) >= 20 else 'needs_ocr', 'reviewed': False})
    output.parent.mkdir(parents=True, exist_ok=True)
    scans = [page for page in pages if page['method'] == 'needs_ocr']
    if scans and args.ocr:
        poppler = shutil.which('pdftoppm')
        powershell = shutil.which('powershell.exe')
        ocr_script = Path(__file__).with_name('ocr-windows.ps1')
        if not poppler or not powershell or not ocr_script.exists():
            raise RuntimeError('OCR requires pdftoppm and the Windows OCR helper. Native extraction remains available without --ocr.')
        image_dir = output.parent / (output.stem + '-pages')
        image_dir.mkdir(exist_ok=True)
        for page in scans:
            prefix = image_dir / f"page-{page['number']:04}"
            subprocess.run([poppler, '-f', str(page['number']), '-l', str(page['number']), '-singlefile', '-scale-to', '1600', '-png', str(source), str(prefix)], check=True, capture_output=True)
        subprocess.run([powershell, '-NoProfile', '-File', str(ocr_script), '-Directory', str(image_dir), '-Pattern', 'page-*.png'], check=True, capture_output=True)
        for page in scans:
            text_file = image_dir / f"page-{page['number']:04}.png.txt"
            text = text_file.read_text(encoding='utf-8-sig').strip()
            if text:
                page.update(text=text, method='ocr')
    for page in pages:
        text = page['text'].lower()
        page['roleSuggestion'] = 'answers' if 'answer key' in text or 'đáp án' in text else 'exercises' if 'practice' in text or 'quiz' in text else 'theory'
    bundle = {'schema': 1, 'source': {'id': args.source_id, 'sha256': digest.hexdigest(), 'byteSize': source.stat().st_size, 'pageCount': len(pages)}, 'pipelineVersion': args.pipeline_version, 'pages': pages, 'lessons': []}
    output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'pages': len(pages), 'native': sum(p['method'] == 'native' for p in pages), 'ocr': sum(p['method'] == 'ocr' for p in pages), 'needsOCR': sum(p['method'] == 'needs_ocr' for p in pages), 'needsReview': True}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Extraction failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
