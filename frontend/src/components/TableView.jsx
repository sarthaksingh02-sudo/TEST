import React, { useState, useEffect } from 'react';
import { extractTableParameters, autoSuggestParameters, queryDocuments } from '../api/client';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import './TableView.css';

export default function TableView({ sessionId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [parametersText, setParametersText] = useState("Disease, Gene, Symptoms, Effective Prevention/Drugs");
  const [extractedParams, setExtractedParams] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [researchSummary, setResearchSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  const handleGenerateSummary = async () => {
    if (!data || data.length === 0) return;
    setSummarizing(true);
    setError(null);
    try {
      const prompt = "Please provide a high-level clinical research summary based on the extracted data from these documents. Synthesize the key findings, common symptoms, and recommended treatments mentioned across all sources.";
      const res = await queryDocuments(prompt, sessionId);
      setResearchSummary(res.data.answer);
    } catch (err) {
      console.error(err);
      setError("Failed to generate research summary.");
    } finally {
      setSummarizing(false);
    }
  };

  const handleAutoSuggest = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const res = await autoSuggestParameters(sessionId);
      if (res.data.parameters && res.data.parameters.length > 0) {
        setParametersText(res.data.parameters.join(", "));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to auto-suggest parameters. Try again.");
    } finally {
      setSuggesting(false);
    }
  };

  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = parametersText.split(',').map(p => p.trim()).filter(p => p);
      const res = await extractTableParameters(sessionId, params);
      setData(res.data.rows);
      setExtractedParams(res.data.parameters);
    } catch (err) {
      console.error(err);
      setError("Failed to extract table data. Make sure documents are loaded and API is reachable.");
    } finally {
      setLoading(false);
    }
  };

  // Only auto-extract if data is null when first mounted or sessionId changes
  useEffect(() => {
    setData(null);
  }, [sessionId]);

  const handleExportPDF = () => {
    if (!data || data.length === 0) return;
    const doc = new jsPDF();
    doc.text("Clinical Data Report", 14, 15);
    
    const head = [["Document Source", ...extractedParams]];
    const body = data.map(row => [row.source_file, ...extractedParams.map(p => row.extracted_data[p] || "")]);
    
    doc.autoTable({
      head: head,
      body: body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [93, 202, 165] }
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    doc.save(`clinical_report_${timestamp}.pdf`);
  };

  const handleExportDOCX = () => {
    if (!data || data.length === 0) return;
    
    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Document Source", bold: true })] })] }),
            ...extractedParams.map(p => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p, bold: true })] })] }))
        ]
    });
    
    const dataRows = data.map(row => {
        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(row.source_file)] }),
                ...extractedParams.map(p => new TableCell({ children: [new Paragraph(row.extracted_data[p] || "")] }))
            ]
        });
    });
    
    const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
    });
    
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ children: [new TextRun({ text: "Clinical Data Report", bold: true, size: 28 })] }),
                new Paragraph(" "),
                table
            ],
        }],
    });
    
    Packer.toBlob(doc).then(blob => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        saveAs(blob, `clinical_report_${timestamp}.docx`);
    });
  };

  return (
    <div className="table-view-container">
      <div className="table-controls glass-card">
        <h3>Parameter Extraction</h3>
        <p className="hint">Enter a comma-separated list of headings you want to extract from the documents.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={parametersText}
            onChange={(e) => setParametersText(e.target.value)}
            className="search-input"
            style={{ flex: 1 }}
          />
          <button 
            className="tab-btn active" 
            onClick={handleExtract}
            disabled={loading || suggesting}
            style={{ minWidth: '120px' }}
          >
            {loading ? "Extracting..." : "Extract Data"}
          </button>
          <button 
            className="tab-btn" 
            onClick={handleAutoSuggest}
            disabled={loading || suggesting}
            style={{ 
              background: 'rgba(99,102,241,0.1)', 
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc'
            }}
          >
            {suggesting ? "Analyzing..." : "Auto-Detect Parameters"}
          </button>
        </div>
        {error && <div className="error-text" style={{ marginTop: '10px', color: '#ff6b6b' }}>{error}</div>}
      </div>

      <div className="table-results glass-card" style={{ marginTop: '20px', overflowX: 'auto' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Scanning documents and extracting parameters using AI. This may take a few moments...</p>
          </div>
        ) : data && data.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
              <button 
                onClick={handleGenerateSummary} 
                className="tab-btn"
                disabled={summarizing}
                style={{ background: 'var(--accent-indigo)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {summarizing ? "Synthesizing..." : "✧ Generate Research Summary"}
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleExportPDF} 
                  className="tab-btn"
                  style={{ background: 'var(--bg-accent)', border: '1px solid var(--border-primary)', padding: '6px 12px', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Export PDF
                </button>
                <button 
                  onClick={handleExportDOCX} 
                  className="tab-btn"
                  style={{ background: 'var(--bg-accent)', border: '1px solid var(--border-primary)', padding: '6px 12px', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Export DOCX
                </button>
              </div>
            </div>

            {researchSummary && (
              <div className="glass-card" style={{ marginBottom: '24px', padding: '20px', borderLeft: '4px solid var(--accent-indigo)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-indigo)', fontSize: '14px', letterSpacing: '0.05em' }}>EXECUTIVE RESEARCH SUMMARY</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {researchSummary}
                </div>
                <button 
                  onClick={() => setResearchSummary(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11px', marginTop: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Dismiss Summary
                </button>
              </div>
            )}

            <table className="extraction-table">
            <thead>
              <tr>
                <th>Document Source</th>
                {extractedParams.map((param, i) => (
                  <th key={i}>{param}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="source-col" style={{ fontSize: '11px', fontWeight: '400', color: 'rgba(255,255,255,0.4)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.source_file}
                  </td>
                  {extractedParams.map((param, j) => {
                    const value = row.extracted_data[param] || "";
                    const confidenceMatch = value.match(/\[(\d+%)\]/);
                    const confidence = confidenceMatch ? confidenceMatch[1] : null;
                    const cleanValue = confidence ? value.replace(confidenceMatch[0], "").trim() : value;
                    
                    return (
                      <td key={j} style={{ position: 'relative' }}>
                        <div className="cell-content">{cleanValue}</div>
                        {confidence && (
                          <div style={{ 
                            fontSize: '9px', 
                            color: parseInt(confidence) > 80 ? '#4ade80' : '#fbbf24', 
                            marginTop: '4px',
                            fontWeight: '600'
                          }}>
                            {confidence} Confidence
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </>
        ) : data && data.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
            No documents found in this session. Please upload a PDF to extract data.
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
            Review the parameters above and click "Extract Data" to generate the table.
          </div>
        )}
      </div>
    </div>
  );
}
