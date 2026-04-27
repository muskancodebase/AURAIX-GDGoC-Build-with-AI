'use client';

import { useState, useRef } from 'react';

const CATEGORIES = ['Product', 'Investor', 'Customer', 'Finance', 'Other'];

interface LogResult {
  summary: string;
  conflict: {
    severity: string;
    conflictType: string;
    explanation: string;
    suggestedResolution: string;
  } | null;
}

export default function LogPage() {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Product');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LogResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);

    const founder = localStorage.getItem('syncguard_founder') || 'Alice (CEO)';

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), category, founder_id: founder }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ summary: data.summary, conflict: data.conflict });
        setContent('');
      } else {
        setResult({ summary: 'Error: ' + (data.error || 'Unknown error'), conflict: null });
      }
    } catch {
      setResult({ summary: 'Network error. Please try again.', conflict: null });
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSlack = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setContent((prev) => prev ? prev + '\n' + text.trim() : text.trim());
      } else {
        const textarea = document.getElementById('decision-textarea') as HTMLTextAreaElement | null;
        textarea?.focus();
      }
    } catch {
      // Clipboard API not available or denied — fall back to focusing textarea
      const textarea = document.getElementById('decision-textarea') as HTMLTextAreaElement | null;
      textarea?.focus();
      alert('Paste permission denied. Please paste manually (Ctrl+V) in the text box.');
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) return;

        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const base64 = await blobToBase64(blob);
          const baseMime = mimeType.split(';')[0]; // strip codec param for API

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64, mimeType: baseMime }),
          });
          const data = await res.json();
          if (data.text) {
            setContent((prev) => prev ? prev + '\n' + data.text : data.text);
          } else {
            alert('Transcription failed. Please type your decision instead.');
          }
        } catch {
          alert('Transcription error. Please type your decision instead.');
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      alert('Microphone access denied. Please allow microphone access.');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Log Decision</h1>
        <p className="page-subtitle">Record a team decision — AI will check for conflicts automatically</p>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="decision-textarea">Decision</label>
          <textarea
            id="decision-textarea"
            className="form-textarea"
            placeholder="Type or paste a decision here…&#10;&#10;Example: &quot;We decided to switch our primary target market to enterprise customers starting Q3.&quot;"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
        </div>

        <div className="log-actions-row">
          <button className="btn btn-ghost" onClick={handlePasteSlack} type="button">
            📋 Paste from Slack
          </button>
          <button
            className={`voice-btn ${recording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={transcribing}
            type="button"
          >
            <span className="voice-dot" />
            {transcribing ? 'Transcribing…' : recording ? 'Stop Recording' : 'Voice Note'}
          </button>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="category-select">Category</label>
          <select
            id="category-select"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || transcribing || !content.trim()}
          style={{ minWidth: 160 }}
        >
          {loading ? <><span className="spinner" /> Analyzing…</> : '🚀 Submit Decision'}
        </button>

        {result && (
          <div className={`result-panel ${result.conflict ? 'has-conflict' : ''}`}>
            <div className="result-summary">
              <strong>Summary:</strong> {result.summary}
            </div>
            {result.conflict ? (
              <div style={{ marginTop: 12 }}>
                <div className={`severity-badge ${result.conflict.severity}`} style={{ marginBottom: 8 }}>
                  ⚠️ {result.conflict.conflictType}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {result.conflict.explanation}
                </div>
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                  💡 {result.conflict.suggestedResolution}
                </div>
              </div>
            ) : (
              <div className="result-meta">✅ No conflicts detected with prior decisions.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URI prefix (e.g. "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
