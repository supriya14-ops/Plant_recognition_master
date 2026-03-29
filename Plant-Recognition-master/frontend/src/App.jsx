import { useState, useRef, useCallback } from 'react'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAiMode, setIsAiMode] = useState(false)
  const [result, setResult] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [medicinalDetails, setMedicinalDetails] = useState(null)
  const [error, setError] = useState(null)

  const fileInputRef = useRef(null)

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setResult(null)
      setConfidence(null)
      setMedicinalDetails(null)
      setError(null)
    } else {
      setError("Please select a valid image file.")
    }
  }

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handlePredict = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setError(null)
    setResult(null)
    setConfidence(null)
    setMedicinalDetails(null)

    const formData = new FormData()
    formData.append('image', selectedFile)
    formData.append('aiMode', isAiMode)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/predict`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze image')
      }

      setResult(data.prediction)

      if (data.confidence !== undefined) {
        setConfidence(data.confidence)
      }

      if (data.medicinalDetails) {
        setMedicinalDetails(data.medicinalDetails);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while connecting to the server')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setConfidence(null)
    setMedicinalDetails(null)
    setError(null)
  }

  return (
    <div className="app-container">
      <h1>Plant Identifier</h1>
      <p className="subtitle">Discover medicinal plants using PSO optimization technology.</p>

      {!selectedFile ? (
        <>
          <div className="toggle-container">
            <span className={`toggle-label ${!isAiMode ? 'active' : ''}`}>Local Model</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={isAiMode}
                onChange={() => setIsAiMode(!isAiMode)}
              />
              <span className="slider round"></span>
            </label>
            <span className={`toggle-label ${isAiMode ? 'active-ai' : ''}`}>Gemini Vision</span>
          </div>

          <div
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              accept="image/*"
            />
            <div className="dropzone-content">
              <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <div>
                <span className="text-primary">Click to upload</span> or drag and drop
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>SVG, PNG, JPG or GIF</div>
            </div>
          </div>
        </>
      ) : (
        <div className="preview-container">
          <img src={previewUrl} alt="Preview" className="image-preview" />
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <div style={{ color: '#10b981', fontWeight: 500 }}>Analyzing plant characteristics...</div>
            </div>
          ) : result ? (
            <div className="result-container">
              {confidence !== null && confidence < 0.50 ? (
                <div className="result-card main-card" style={{ borderLeft: '4px solid #ef4444' }}>
                  <h3 style={{ color: '#ef4444' }}>Unrecognized Image</h3>
                  <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
                    This doesn't look like a medicinal plant we recognize, or the image quality is too low.
                  </p>
                  <div className="confidence-container" style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                      <span>Model Confidence</span>
                      <span>{Math.round(confidence * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${confidence * 100}%`,
                        background: 'linear-gradient(90deg, #ef4444, #f87171)',
                        borderRadius: '4px',
                        transition: 'width 1s ease-out'
                      }}></div>
                    </div>
                  </div>
                  <p style={{ marginTop: '1rem', fontWeight: 500, color: '#f8fafc' }}>
                    Please try uploading a clear image of a plant leaf.
                  </p>
                  <button className="btn btn-secondary" onClick={resetForm} style={{ marginTop: '1.5rem', width: '100%' }}>
                    Try Another Image
                  </button>
                </div>
              ) : (
                <>
                  <div className="result-card main-card">
                    <h3>Identified Plant</h3>
                    <p className="result-plant">{result.replace(/_/g, ' ')}</p>
                    {medicinalDetails?.scientific_name && (
                      <p className="scientific-name" style={{
                        fontStyle: 'italic',
                        color: '#64748b',
                        marginTop: '-0.5rem',
                        fontSize: '1.1rem'
                      }}>
                        {medicinalDetails.scientific_name}
                      </p>
                    )}

                    {confidence !== null && (
                      <div className="confidence-container" style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                          <span>Model Confidence</span>
                          <span>{Math.round(confidence * 100)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${confidence * 100}%`,
                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                            borderRadius: '4px',
                            transition: 'width 1s ease-out'
                          }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {medicinalDetails && (
                    <div className="details-grid">
                      <div className="result-card detail-card uses-card">
                        <h3><span className="icon">🌿</span> Medicinal Uses</h3>
                        <ul>
                          {medicinalDetails.uses.map((use, idx) => (
                            <li key={idx}>{use}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="result-card detail-card diseases-card">
                        <h3><span className="icon">🛡️</span> Treatable Diseases</h3>
                        <div className="pill-container">
                          {medicinalDetails.diseases.map((disease, idx) => (
                            <span key={idx} className="disease-pill">{disease}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={resetForm}>
                Choose Different Image
              </button>
              <button className="btn btn-primary" onClick={handlePredict}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Analyze Image
              </button>
            </div>
          )}

          {result && (
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={resetForm}>Scan Another Plant</button>
            </div>
          )}
        </div>
      )
      }

      {
        error && (
          <div className="error-message">
            {error}
          </div>
        )
      }
    </div >
  )
}

export default App
