import React, { useState, useRef } from 'react';
import { Save, Trash2, Mic, MicOff, Copy, Check } from 'lucide-react';

export default function Threadify() {
  const [step, setStep] = useState('input');
  const [paragraph, setParagraph] = useState('');
  const [understood, setUnderstood] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [preferences, setPreferences] = useState({ format: null, detail: null });
  const [explanation, setExplanation] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savedExplanations, setSavedExplanations] = useState([]);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const recognitionRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Initialize speech recognition
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setUnderstood((prev) => prev + transcript + ' ');
          } else {
            interimTranscript += transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
      };
    }
  }, []);

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
      setError('');
    } else {
      setError('Speech recognition not supported in your browser');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleExplain = () => {
    if (paragraph.trim()) {
      setStep('explain');
      setError('');
    } else {
      setError('Please paste a paragraph first');
    }
  };

  const handleUnderstood = () => {
    if (understood.trim()) {
      setStep('preferences');
      setError('');
    } else {
      setError('Please tell me what you understood');
    }
  };

  const handlePreferences = async (format, detail) => {
    setPreferences({ format, detail });
    setLoading(true);
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter your Claude API key');
      setShowApiKeyInput(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
model: ‘claude-sonnet-4-5-20250929’,  // Updated model
max_tokens: 1024,
messages: [
{
role: ‘user’,
content: `You are an expert adaptive tutor helping a student understand a concept. Your superpower is matching how each student thinks and communicates.

ORIGINAL TEXT:
“${paragraph}”

STUDENT’S PARTIAL UNDERSTANDING:
“${understood}”

STUDENT’S PREFERENCES:

- Format: ${format === ‘story’ ? ‘Narrative/story-based’ : ‘Bullet points and clear structure’}
- Detail level: ${detail === ‘brief’ ? ‘Keep it concise and simple’ : ‘Provide detailed explanations with examples’}

YOUR TASK:

STEP 1 - ANALYZE their cognitive style from their response:

- Do they use analogies/metaphors? (e.g., “like a…”, “kind of like…”)
- Do they use technical/scientific terms? (e.g., proper vocabulary, formal language)
- Do they tell stories or reference memories? (e.g., “I remember…”, “my teacher said…”)
- Do they ask questions in their explanation? (e.g., “so it’s about…?”)
- Are they visual/spatial thinkers? (e.g., “I picture it as…”, “I see it as…”)
- Are they casual or formal in tone?

STEP 2 - ACKNOWLEDGE their understanding:
Start by validating what they got right. Use their own words where possible.

STEP 3 - BUILD from their understanding using THEIR communication style:

- If they used analogies → continue with similar analogies and metaphors
- If they used technical terms → match that vocabulary level and precision
- If they told stories → build a narrative that extends their story
- If they asked questions → answer in a conversational Q&A style
- If they’re visual → use spatial and descriptive language
- If they’re casual → keep it conversational and friendly
- If they’re formal → maintain professional clarity

STEP 4 - FORMAT appropriately:

- Use *bold* for key terms and concepts
- ${format === ‘story’ ? ‘Write as a flowing narrative that builds naturally from their understanding’ : ‘Use clear structure with natural progression’}
- ${detail === ‘brief’ ? ‘Keep it concise: 2-3 short paragraphs maximum’ : ‘Provide thorough explanation: 3-4 paragraphs with examples and depth’}

CRITICAL: Match their language style throughout. If they say “like a battery”, don’t suddenly switch to “analogous to an electrochemical cell” unless they used that level of language first.

Respond with ONLY the explanation. No meta-commentary about their learning style.`,
},
],
}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      const data = await response.json();
      const generatedExplanation = data.content[0].text;
      
      // Convert markdown bold to HTML for display
      const formattedExplanation = generatedExplanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      setExplanation(formattedExplanation);
      setStep('explanation');
    } catch (err) {
      setError(`Error: ${err.message}`);
      setStep('preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const newExplanation = {
      id: Date.now(),
      paragraph: paragraph.substring(0, 50) + '...',
      understood,
      explanation,
      rating,
      timestamp: new Date().toLocaleDateString(),
    };
    setSavedExplanations([...savedExplanations, newExplanation]);
    resetForm();
    setStep('saved');
  };

  const handleDelete = (id) => {
    setSavedExplanations(savedExplanations.filter((e) => e.id !== id));
  };

  const resetForm = () => {
    setParagraph('');
    setUnderstood('');
    setPreferences({ format: null, detail: null });
    setExplanation('');
    setRating(0);
  };

  const startOver = () => {
    resetForm();
    setStep('input');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(explanation.replace(/<[^>]*>/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">Threadify</h1>
          <p className="text-indigo-600">Learn by building on what you already understand</p>
          {!apiKey && (
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 underline"
            >
              {showApiKeyInput ? 'Hide' : 'Add Claude API Key'}
            </button>
          )}
          {apiKey && <p className="text-green-600 text-sm mt-2">✓ API Key configured</p>}
        </div>

        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-yellow-400">
            <p className="text-sm text-gray-600 mb-3">
              Get your free API key at{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
            />
            {apiKey && (
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="mt-3 text-sm text-green-600 hover:text-green-800"
              >
                ✓ Key saved
              </button>
            )}
          </div>
        )}

        {/* Input Step */}
        {step === 'input' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Paste the paragraph you want to understand</h2>
            <textarea
              value={paragraph}
              onChange={(e) => setParagraph(e.target.value)}
              placeholder="Paste the text here..."
              className="w-full h-40 p-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
            />
            {error && <p className="text-red-500 mt-2">{error}</p>}
            <button
              onClick={handleExplain}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
            >
              Explain This →
            </button>
          </div>
        )}

        {/* Explain Step */}
        {step === 'explain' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">What did you understand from this?</h2>
            <p className="text-gray-600 mb-4">
              Even if it's just fragments—that's perfect. Tell me what stuck with you.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6 max-h-32 overflow-y-auto border-l-4 border-indigo-400">
              <p className="text-sm text-gray-700 italic">{paragraph}</p>
            </div>

            <div className="mb-4">
              <p className="font-semibold text-gray-700 mb-2">Type or Record:</p>
              <textarea
                value={understood}
                onChange={(e) => setUnderstood(e.target.value)}
                placeholder="What did you understand? Write freely, even if it seems incomplete..."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none resize-none mb-3"
              />
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex-1 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff size={20} /> Stop Recording
                  </>
                ) : (
                  <>
                    <Mic size={20} /> Record What You Understood
                  </>
                )}
              </button>
            </div>

            {error && <p className="text-red-500 mt-2">{error}</p>}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep('input')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleUnderstood}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Preferences Step */}
        {step === 'preferences' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">How would you like this explained?</h2>

            <div className="mb-8">
              <p className="font-semibold text-gray-700 mb-3">Format:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePreferences('story', preferences.detail)}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg font-semibold transition ${
                    preferences.format === 'story'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  📖 Story/Narrative
                </button>
                <button
                  onClick={() => handlePreferences('bullets', preferences.detail)}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg font-semibold transition ${
                    preferences.format === 'bullets'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  📋 Bullet Points
                </button>
              </div>
            </div>

            <div className="mb-8">
              <p className="font-semibold text-gray-700 mb-3">Level of Detail:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePreferences(preferences.format, 'brief')}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg font-semibold transition ${
                    preferences.detail === 'brief'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  ⚡ Brief & Simple
                </button>
                <button
                  onClick={() => handlePreferences(preferences.format, 'detailed')}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg font-semibold transition ${
                    preferences.detail === 'detailed'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  📚 Detailed & Deep
                </button>
              </div>
            </div>

            {loading && (
              <div className="text-center py-4">
                <p className="text-indigo-600 font-semibold">Analyzing your understanding and generating explanation...</p>
              </div>
            )}

            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {/* Explanation Step */}
        {step === 'explanation' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Here's your personalized explanation:</h2>
            <div className="bg-indigo-50 p-6 rounded-lg mb-6 border-l-4 border-indigo-400">
              <div
                className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: explanation.replace(/\n/g, '<br />'),
                }}
              />
            </div>

            <div className="mb-6">
              <p className="font-semibold text-gray-700 mb-3">Did this help you understand better?</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-3xl transition hover:scale-110"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={startOver}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition"
              >
                Learn Something Else
              </button>
              <button
                onClick={copyToClipboard}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Save size={20} /> Save This
              </button>
            </div>
          </div>
        )}

        {/* Saved Step */}
        {step === 'saved' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">✓ Saved!</h2>
            <p className="text-gray-600 mb-6">Your explanation has been saved to your library.</p>
            <button
              onClick={() => setStep('input')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Learn Something Else
            </button>
          </div>
        )}

        {/* Saved Explanations List */}
        {savedExplanations.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Saved Explanations ({savedExplanations.length})</h3>
            <div className="space-y-4">
              {savedExplanations.map((exp) => (
                <div key={exp.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{exp.paragraph}</p>
                      <p className="text-sm text-gray-500 mt-1">{exp.timestamp}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">You understood: "{exp.understood}"</p>
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < exp.rating ? '⭐' : '☆'}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
