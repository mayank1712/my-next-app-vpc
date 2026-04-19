"use client";

import { useEffect, useState, useCallback } from "react";

interface S3File {
  key: string;
  url: string;
  size: number;
}

interface S3FileList {
  originals: S3File[];
  compressed: S3File[];
}

type ProcessorTab = "images" | "pdfs";

export default function Home() {
  const [files, setFiles] = useState<S3FileList>({ originals: [], compressed: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ProcessorTab>("images");
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize or recover sessionId
    let id = localStorage.getItem("session_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 11);
      localStorage.setItem("session_id", id);
    }
    setSessionId(id);
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const fetchFiles = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/uploads/list?sessionId=${sessionId}`);
      if (!res.ok) {
        throw new Error(`Cloud server is currently unavailable (Status: ${res.status})`);
      }
      const data = await res.json();
      setFiles(data);
      setBackendError(null); // Clear error on success
    } catch (err: any) {
      console.error("Failed to fetch files:", err.message);
      setBackendError(err.message);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchFiles().finally(() => setLoading(false));
  }, [fetchFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // 1. Get presigned URL
      const res = await fetch(
        `/api/uploads/presigned-url?sessionId=${sessionId}&fileName=${encodeURIComponent(selectedFile.name)}&contentType=${encodeURIComponent(selectedFile.type)}`
      );
      
      if (!res.ok) {
        throw new Error("Backend server is offline or unreachable.");
      }

      const { url } = await res.json();
      console.log("Uploading to S3 with URL:", url);

      // 2. Upload directly to S3
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: selectedFile,
        mode: "cors",
      });

      if (uploadRes.ok) {
        alert("Upload successful! Conversion will start automatically.");
        setSelectedFile(null);
        setTimeout(fetchFiles, 3000);
      } else {
        const errorText = await uploadRes.text();
        console.error("S3 Upload failed with status:", uploadRes.status, errorText);
        throw new Error(`S3 Upload failed: ${uploadRes.status} ${errorText}`);
      }
    } catch (err: any) {
      console.error("Upload process encountered an error:", err);
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        alert("Upload Blocked: This is likely an S3 CORS issue. Check your browser console for security errors.");
      } else {
        alert(`Upload failed: ${err.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const isImage = (key: string) => /\.(jpg|jpeg|png|webp)$/i.test(key);
  const isPdf = (key: string) => /\.pdf$/i.test(key);

  const filterFiles = (list: S3File[]) => {
    if (activeTab === "images") return list.filter(f => isImage(f.key));
    return list.filter(f => isPdf(f.key));
  };

  const filteredOriginals = filterFiles(files.originals);
  const filteredCompressed = filterFiles(files.compressed);

  return (
    <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12">
      {/* Header */}
      <header className="animate-fade-in flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-4">
            Cloud Optimizer Pro
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Intelligent compression and optimization for your media and documents.
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700 w-fit">
          <button 
            onClick={() => setActiveTab("images")}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'images' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Images
          </button>
          <button 
            onClick={() => setActiveTab("pdfs")}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'pdfs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            PDF Documents
          </button>
        </div>
      </header>

      {/* Upload Section */}
      <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="glass rounded-3xl p-8 md:p-12 border-dashed border-2 border-indigo-500/30 hover:border-indigo-500/50 transition-all">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${activeTab === 'images' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              {activeTab === 'images' ? (
                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-200">
                {selectedFile ? selectedFile.name : `Select ${activeTab === 'images' ? 'an image' : 'a PDF'} to optimize`}
              </h3>
              <p className="text-slate-500 mt-2">
                {activeTab === 'images' ? "Support for JPG, PNG, WEBP (Max 20MB)" : "Full PDF support with lossless metadata optimization"}
              </p>
            </div>
            <div className="flex gap-4">
              <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-medium border border-slate-700">
                Browse Files
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  accept={activeTab === 'images' ? "image/*" : ".pdf"} 
                />
              </label>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  !selectedFile || uploading
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : activeTab === 'images' 
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                      : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20"
                }`}
              >
                {uploading ? "Analyzing..." : `Optimize ${activeTab === 'images' ? 'Image' : 'PDF'}`}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Files Grid */}
      <section className="space-y-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {backendError && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-400 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{backendError} - Results may be outdated.</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-200 capitalize">{activeTab} Processing</h2>
          <button onClick={fetchFiles} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">Refresh List</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Originals */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-400">Original Sources</h3>
            <div className="space-y-4">
              {filteredOriginals.length > 0 ? (
                filteredOriginals.map((file, i) => (
                  <div key={i} className="glass p-4 rounded-2xl flex items-center justify-between group">
                    <div className="flex flex-col overflow-hidden mr-4">
                      <span className="text-slate-300 truncate font-mono text-sm">{file.key.split("/").pop()}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">{formatBytes(file.size)}</span>
                    </div>
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all text-xs font-bold uppercase tracking-wider bg-indigo-400/10 px-3 py-2 rounded-lg border border-indigo-400/20">View</a>
                  </div>
                ))
              ) : (
                <div className="glass-light p-8 rounded-2xl border border-dashed border-slate-700 text-center">
                  <p className="text-slate-600 italic text-sm">No {activeTab} uploaded yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Compressed */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-green-400">Optimized Results</h3>
            <div className="space-y-4">
              {filteredCompressed.length > 0 ? (
                filteredCompressed.map((file, i) => (
                  <div key={i} className="glass p-4 rounded-2xl flex items-center justify-between border-green-500/20 group hover:border-green-500/40 transition-all">
                    <div className="flex flex-col overflow-hidden mr-4">
                      <span className="text-green-300 truncate font-mono text-sm leading-none">{file.key.split("/").pop()}</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 font-bold uppercase">Ready</span>
                        <span className="text-[10px] text-slate-500 font-bold">{formatBytes(file.size)}</span>
                      </div>
                    </div>
                    <a href={file.url} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-green-500/20 transition-all">Get File</a>
                  </div>
                ))
              ) : (
                <div className="glass-light p-8 rounded-2xl border border-dashed border-slate-700 text-center">
                  <p className="text-slate-600 italic text-sm">Waiting for new {activeTab}...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}