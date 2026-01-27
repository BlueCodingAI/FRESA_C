"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";
import RichTextEditor from "@/components/RichTextEditor";

interface IntroductionData {
  id?: string;
  text: string;
  audioUrl: string;
  timestampsUrl: string;
}

export default function IntroductionEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [introData, setIntroData] = useState<IntroductionData>({
    text: "Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission.",
    audioUrl: "/audio/intro.mp3",
    timestampsUrl: "/timestamps/intro.timestamps.json",
  });

  // TTS Settings - load from localStorage or use defaults
  const [ttsSettings, setTtsSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inworld-tts-settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved TTS settings:', e);
        }
      }
    }
    return {
      modelId: 'inworld-tts-1',
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      sampleRateHertz: 48000,
      bitRate: 128000,
      temperature: 1.1,
      timestampType: 'WORD',
      applyTextNormalization: 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED',
    };
  });

  // Save TTS settings to localStorage
  const saveTTSSettings = (settings: typeof ttsSettings) => {
    setTtsSettings(settings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inworld-tts-settings', JSON.stringify(settings));
    }
  };

  // Helper function to strip HTML and get plain text for audio generation
  const stripHTML = (html: string): string => {
    if (typeof document === 'undefined') {
      // Server-side: simple regex strip
      const tmp = html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      return tmp;
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  };

  // Helper function to build request body with TTS settings
  const buildAudioRequest = (text: string, context: 'section' | 'quiz' | 'introduction' = 'introduction') => {
    // Strip HTML from text before sending to audio generation API
    // (API route also cleans text, but this provides an extra layer of protection)
    const plainText = stripHTML(text);
    return {
      text: plainText,
      type: 'both',
      context,
      ...ttsSettings, // Include all TTS settings
    };
  };

  useEffect(() => {
    fetchIntroduction();
  }, []);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  const fetchIntroduction = async () => {
    try {
      const token = getToken();
      // For now, we'll use a special chapter number 0 for introduction
      // Or we can create a dedicated API endpoint
      const response = await fetch("/api/admin/introduction", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.introduction) {
          setIntroData(data.introduction);
        }
      }
    } catch (err) {
      console.error("Error fetching introduction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudio = async (text: string) => {
    if (!text || text.trim().length === 0) {
      alert("Please enter text content first");
      return;
    }

    try {
      setGeneratingAudio(true);
      const token = getToken();
      
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildAudioRequest(text, 'introduction')),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedData = {
          ...introData,
          audioUrl: data.audioUrl,
          timestampsUrl: data.timestampsUrl,
        };
        setIntroData(updatedData);
        
        // Automatically save the introduction with generated URLs
        try {
          const token = getToken();
          const saveResponse = await fetch("/api/admin/introduction", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify(updatedData),
          });

          if (saveResponse.ok) {
            alert(`✅ Audio and timestamps generated and saved successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}\n\nThe introduction page has been updated with these files.`);
          } else {
            const saveError = await saveResponse.json();
            alert(`⚠️ Audio and timestamps generated, but failed to save:\n${saveError.error || 'Unknown error'}\n\nYou can manually save by clicking "Save Introduction".`);
          }
        } catch (saveErr) {
          console.error('Error auto-saving:', saveErr);
          alert(`⚠️ Audio and timestamps generated, but failed to save automatically.\n\nYou can manually save by clicking "Save Introduction".`);
        }
      } else {
        const error = await response.json();
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating audio:', err);
      alert('Failed to generate audio');
    } finally {
      setGeneratingAudio(false);
    }
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch("/api/admin/introduction", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(introData),
      });

      if (response.ok) {
        alert("Introduction page saved successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save"}`);
      }
    } catch (err) {
      console.error("Error saving introduction:", err);
      alert("Failed to save introduction");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <Link
            href="/admin"
            className="text-cyan-400 hover:text-cyan-300 mb-3 md:mb-4 inline-block text-sm md:text-base"
          >
            ← Back to Admin Panel
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-2">
            Edit Introduction Page
          </h1>
        </div>

        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-500/20 p-4 md:p-6">
          <div className="space-y-4 md:space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                <label className="block text-sm font-medium text-gray-300">
                  Introduction Text
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTTSSettings(true)}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs md:text-sm font-semibold rounded-lg transition-all flex-1 sm:flex-none"
                    title="TTS Settings"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateAudio(introData.text)}
                    disabled={generatingAudio || !introData.text || introData.text.trim().length === 0}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs md:text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                  >
                    {generatingAudio ? "🔄 Generating..." : "🎙️ Generate Audio & Timestamps"}
                  </button>
                </div>
              </div>
              <RichTextEditor
                value={introData.text}
                onChange={(value) =>
                  setIntroData({ ...introData, text: value })
                }
                rows={6}
                placeholder="Enter introduction text..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter your text and click "Generate Audio & Timestamps" to automatically create audio and timestamp files using Inworld AI
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Audio URL
              </label>
              <input
                type="text"
                value={introData.audioUrl}
                onChange={(e) =>
                  setIntroData({ ...introData, audioUrl: e.target.value })
                }
                className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                placeholder="/audio/intro.mp3"
              />
              <p className="text-xs text-gray-400 mt-1">Audio URL will be generated automatically when you click "Generate Audio & Timestamps"</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timestamps URL
              </label>
              <input
                type="text"
                value={introData.timestampsUrl}
                onChange={(e) =>
                  setIntroData({ ...introData, timestampsUrl: e.target.value })
                }
                className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                placeholder="/timestamps/intro.timestamps.json"
              />
              <p className="text-xs text-gray-400 mt-1">Timestamps URL will be generated automatically when you click "Generate Audio & Timestamps"</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-4 md:mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 text-sm md:text-base"
              >
                {saving ? "Saving..." : "Save Introduction"}
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all text-center text-sm md:text-base"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>

        {/* TTS Settings Modal */}
        {showTTSSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-purple-500/20 p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                ⚙️ Inworld TTS Settings
              </h2>

              <div className="space-y-4">
                {/* Model ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Model ID
                  </label>
                  <select
                    value={ttsSettings.modelId}
                    onChange={(e) => saveTTSSettings({ ...ttsSettings, modelId: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  >
                    <option value="inworld-tts-1">inworld-tts-1 (Faster)</option>
                    <option value="inworld-tts-1-max">inworld-tts-1-max (Higher Quality)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Choose between faster generation or higher quality</p>
                </div>

                {/* Audio Encoding */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Audio Encoding
                  </label>
                  <select
                    value={ttsSettings.audioEncoding}
                    onChange={(e) => saveTTSSettings({ ...ttsSettings, audioEncoding: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  >
                    <option value="MP3">MP3 (Default, Compressed)</option>
                    <option value="OGG_OPUS">OGG_OPUS (High Quality, Compressed)</option>
                    <option value="LINEAR16">LINEAR16 (Uncompressed PCM)</option>
                    <option value="FLAC">FLAC (Lossless)</option>
                    <option value="ALAW">ALAW (8-bit Companded)</option>
                    <option value="MULAW">MULAW (8-bit Companded)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Audio format for output</p>
                </div>

                {/* Speaking Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Speaking Rate: {ttsSettings.speakingRate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsSettings.speakingRate}
                    onChange={(e) => saveTTSSettings({ ...ttsSettings, speakingRate: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0.5x (Slower)</span>
                    <span>1.0x (Normal)</span>
                    <span>1.5x (Faster)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Speed of speech (recommended: 0.8-1.2 for quality)</p>
                </div>

                {/* Sample Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sample Rate (Hz)
                  </label>
                  <select
                    value={ttsSettings.sampleRateHertz}
                    onChange={(e) => saveTTSSettings({ ...ttsSettings, sampleRateHertz: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  >
                    <option value="8000">8000 Hz</option>
                    <option value="16000">16000 Hz</option>
                    <option value="22050">22050 Hz</option>
                    <option value="24000">24000 Hz</option>
                    <option value="32000">32000 Hz</option>
                    <option value="44100">44100 Hz</option>
                    <option value="48000">48000 Hz (Default)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Audio sample rate (higher = better quality, larger files)</p>
                </div>

                {/* Bit Rate (only for compressed formats) */}
                {(ttsSettings.audioEncoding === 'MP3' || ttsSettings.audioEncoding === 'OGG_OPUS') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bit Rate (bps)
                    </label>
                    <input
                      type="number"
                      min="32000"
                      max="320000"
                      step="32000"
                      value={ttsSettings.bitRate}
                      onChange={(e) => saveTTSSettings({ ...ttsSettings, bitRate: parseInt(e.target.value) || 128000 })}
                      className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">Bits per second for compressed formats (default: 128000)</p>
                  </div>
                )}

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Temperature: {ttsSettings.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.1"
                    value={ttsSettings.temperature}
                    onChange={(e) => saveTTSSettings({ ...ttsSettings, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0.0 (Deterministic)</span>
                    <span>1.1 (Default)</span>
                    <span>2.0 (Expressive)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Controls randomness/expressiveness (recommended: 1.1 for stability)</p>
                </div>

                {/* Timestamp Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timestamp Type
                  </label>
                  <select
                    value={ttsSettings.timestampType}
                    onChange={(e) => saveTTSSettings({ ...ttsSettings, timestampType: e.target.value as any })}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  >
                    <option value="WORD">WORD (Word-level timestamps)</option>
                    <option value="CHARACTER">CHARACTER (Character-level timestamps)</option>
                    <option value="TIMESTAMP_TYPE_UNSPECIFIED">None (No timestamps)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Type of timestamp alignment (WORD recommended for highlighting)</p>
                </div>

                {/* Text Normalization */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Text Normalization
                  </label>
                  <select
                    value={ttsSettings.applyTextNormalization}
                    onChange={(e) => saveTTSSettings({ ...ttsSettings, applyTextNormalization: e.target.value as any })}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  >
                    <option value="APPLY_TEXT_NORMALIZATION_UNSPECIFIED">Auto (Default)</option>
                    <option value="ON">ON (Expand numbers, dates, abbreviations)</option>
                    <option value="OFF">OFF (Read exactly as written)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Automatically expand numbers, dates, and abbreviations (ON) or read exactly as written (OFF)</p>
                </div>

                {/* Reset to Defaults */}
                <div className="pt-4 border-t border-purple-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      const defaults = {
                        modelId: 'inworld-tts-1',
                        audioEncoding: 'MP3',
                        speakingRate: 1.0,
                        sampleRateHertz: 48000,
                        bitRate: 128000,
                        temperature: 1.1,
                        timestampType: 'WORD',
                        applyTextNormalization: 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED',
                      };
                      saveTTSSettings(defaults);
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-all"
                  >
                    🔄 Reset to Defaults
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTTSSettings(false)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  ✅ Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

