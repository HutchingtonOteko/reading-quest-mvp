import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Use CDN worker to avoid bundler issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function formatPercent(p) { return Math.round(p * 100); }

export default function App() {
  const [pdfData, setPdfData] = useState(null); // { pdf, numPages, title, id }
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load PDF from file input
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const id = file.name; // simple ID, could be improved
    const numPages = pdf.numPages;
    const title = file.name;
    setPdfData({ pdf, numPages, title, id });
    // Try to restore last page
    const saved = localStorage.getItem('rq_lastpage_' + id);
    setPageNum(saved ? Number(saved) : 1);
    setLoading(false);
  }

  // Render current page
  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfData) return;
      const { pdf } = pdfData;
      if (pageNum < 1 || pageNum > pdf.numPages) return;
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderContext = {
        canvasContext: context,
        viewport
      };
      await page.render(renderContext).promise;
      if (cancelled) return;
      // save last page
      localStorage.setItem('rq_lastpage_' + pdfData.id, String(pageNum));
    }
    renderPage();
    return () => { cancelled = true; };
  }, [pdfData, pageNum]);

  function onPrev() { setPageNum(n => Math.max(1, n - 1)); }
  function onNext() { if (pdfData) setPageNum(n => Math.min(pdfData.numPages, n + 1)); }

  return (
    <div className="app-root">
      <header className="topbar">
        <h1>Reading Quest — MVP (PDF)</h1>
        <div className="uploader">
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFile} style={{display:'none'}} />
          <button className="btn" onClick={() => fileInputRef.current.click()}>Upload PDF</button>
        </div>
      </header>

      <main className="reader-area">
        {!pdfData ? (
          <div className="empty">
            <p>No book loaded. Upload a PDF to start reading.</p>
            <p className="muted">Your file stays in your browser — nothing is uploaded.</p>
          </div>
        ) : (
          <div className="reader-card">
            <div className="reader-header">
              <div className="title">{pdfData.title}</div>
              <div className="meta">Page {pageNum} / {pdfData.numPages}</div>
            </div>

            <div className="canvas-wrap">
              <canvas ref={canvasRef} className="pdf-canvas" />
            </div>

            <div className="controls">
              <button className="btn ghost" onClick={onPrev} disabled={pageNum===1}>Prev</button>
              <div className="progress">
                <div className="bar-bg"><div className="bar-fill" style={{width: formatPercent((pageNum-1)/(pdfData.numPages-1)) + '%'}} /></div>
                <div className="progress-label">{formatPercent((pageNum)/(pdfData.numPages))}% read</div>
              </div>
              <button className="btn" onClick={onNext} disabled={pageNum===pdfData.numPages}>Next</button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">Simple MVP • Local only • Later we can add syncing & gamification</footer>
    </div>
  );
}
