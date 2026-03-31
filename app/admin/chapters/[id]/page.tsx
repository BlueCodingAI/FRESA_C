"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";
import RichTextEditor from "@/components/RichTextEditor";

interface Section {
  id: string;
  sectionNumber: number;
  title: string;
  text: string;
  type: string;
  audioUrl: string | null;
  timestampsUrl: string | null;
  imageUrl: string | null;
  order: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    incorrect: string[];
  };
  chapterId?: string | null;
  audioUrl?: string | null;
  timestampsUrl?: string | null;
  questionAudioUrl?: string | null;
  questionTimestampsUrl?: string | null;
  optionAudioUrls?: string[] | null;
  optionTimestampsUrls?: string[] | null;
  explanationAudioUrl?: string | null;
  explanationTimestampsUrl?: string | null;
  correctExplanationAudioUrl?: string | null;
  correctExplanationTimestampsUrl?: string | null;
  incorrectExplanationAudioUrls?: string[] | null;
  incorrectExplanationTimestampsUrls?: string[] | null;
  quizType: string;
  order: number;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string | null;
  sections: Section[];
  quizQuestions?: QuizQuestion[];
}

export default function ChapterEditPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingChapterInfo, setEditingChapterInfo] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    title: "",
    description: "",
  });
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({
    sectionNumber: 1,
    title: "",
    text: "",
    type: "content",
    audioUrl: "",
    timestampsUrl: "",
    imageUrl: "",
    order: 0,
  });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingTimestamps, setUploadingTimestamps] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  
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

  const handleFileUpload = async (file: File, type: 'audio' | 'timestamps' | 'image') => {
    try {
      if (type === 'audio') {
        setUploadingAudio(true);
      } else if (type === 'timestamps') {
        setUploadingTimestamps(true);
      } else if (type === 'image') {
        setUploadingImage(true);
      }

      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'audio') {
          setSectionForm({ ...sectionForm, audioUrl: data.url });
        } else if (type === 'timestamps') {
          setSectionForm({ ...sectionForm, timestampsUrl: data.url });
        } else if (type === 'image') {
          setSectionForm({ ...sectionForm, imageUrl: data.url });
        }
        alert(`File uploaded successfully! URL: ${data.url}`);
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    } finally {
      if (type === 'audio') {
        setUploadingAudio(false);
      } else if (type === 'timestamps') {
        setUploadingTimestamps(false);
      } else if (type === 'image') {
        setUploadingImage(false);
      }
    }
  };

  const handleRemoveImage = () => {
    if (confirm('Are you sure you want to remove this image?')) {
      setSectionForm({ ...sectionForm, imageUrl: "" });
    }
  };

  useEffect(() => {
    if (chapterId && chapterId !== "new") {
      fetchChapter();
    } else {
      setLoading(false);
    }
  }, [chapterId]);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  const fetchChapter = async () => {
    try {
      const token = getToken();
      const response = await fetch(`/api/admin/chapters/${chapterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChapter(data.chapter);
        setChapterForm({
          title: data.chapter.title || "",
          description: data.chapter.description || "",
        });
        setSections(data.chapter.sections || []);
      }
      
      // Fetch quiz questions for this chapter
      const questionsResponse = await fetch(`/api/admin/quiz-questions?chapterId=${chapterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuizQuestions(questionsData.questions || []);
      }
    } catch (err) {
      console.error("Error fetching chapter:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (sectionId?: string) => {
    try {
      const token = getToken();
      const url = sectionId
        ? `/api/admin/sections/${sectionId}`
        : `/api/admin/sections`;
      const method = sectionId ? "PUT" : "POST";

      // Convert empty strings to null for optional fields
      const sectionData = {
        ...sectionForm,
        chapterId: chapterId === "new" ? null : chapterId,
        audioUrl: sectionForm.audioUrl || null,
        timestampsUrl: sectionForm.timestampsUrl || null,
        imageUrl: sectionForm.imageUrl || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sectionData),
      });

      if (response.ok) {
        await fetchChapter();
        setShowSectionForm(false);
        setEditingSection(null);
        setSectionForm({
          sectionNumber: 1,
          title: "",
          text: "",
          type: "content",
          audioUrl: "",
          timestampsUrl: "",
          imageUrl: "",
          order: 0,
        });
      }
    } catch (err) {
      console.error("Error saving section:", err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchChapter();
      }
    } catch (err) {
      console.error("Error deleting section:", err);
    }
  };

  const startEditSection = (section: Section) => {
    setEditingSection(section.id);
    setSectionForm(section);
    setShowSectionForm(true);
  };

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
  const buildAudioRequest = (text: string, context: 'section' | 'quiz' | 'introduction' = 'section', voiceId?: string) => {
    // Strip HTML from text before sending to audio generation API
    const plainText = stripHTML(text);
    return {
      text: plainText,
      type: 'both',
      context,
      voiceId,
      ...ttsSettings, // Include all TTS settings
    };
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
        body: JSON.stringify(buildAudioRequest(text, 'section')),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedForm = {
          ...sectionForm,
          audioUrl: data.audioUrl,
          timestampsUrl: data.timestampsUrl,
        };
        setSectionForm(updatedForm);
        
        // Automatically save the section with generated URLs if we're editing an existing section
        if (editingSection) {
          try {
            const token = getToken();
            const saveResponse = await fetch(`/api/admin/sections/${editingSection}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                ...updatedForm,
                chapterId: chapterId === "new" ? null : chapterId,
              }),
            });

            if (saveResponse.ok) {
              await fetchChapter();
              alert(`✅ Audio and timestamps generated and saved successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}\n\nThe section has been updated with these files.`);
            } else {
              const saveError = await saveResponse.json();
              alert(`⚠️ Audio and timestamps generated, but failed to save:\n${saveError.error || 'Unknown error'}\n\nYou can manually save by clicking "Save Section".`);
            }
          } catch (saveErr) {
            console.error('Error auto-saving:', saveErr);
            alert(`⚠️ Audio and timestamps generated, but failed to save automatically.\n\nYou can manually save by clicking "Save Section".`);
          }
        } else {
          // New section - just show success message
          alert(`✅ Audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}\n\nClick "Save Section" to save the section with these files.`);
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

  const [generatingQuestionAudio, setGeneratingQuestionAudio] = useState(false);
  const [generatingQuizAudio, setGeneratingQuizAudio] = useState(false);
  const [quizGenerationProgress, setQuizGenerationProgress] = useState<{
    generatingQuestion: boolean;
    generatingOptions: number[]; // Array of option indices being generated
    generatingCorrectExplanation: boolean;
    generatingIncorrectExplanations: number[]; // Array of incorrect explanation indices being generated
    completed: {
      question: boolean;
      options: boolean[];
      correctExplanation: boolean;
      incorrectExplanations: boolean[];
    };
  }>({
    generatingQuestion: false,
    generatingOptions: [],
    generatingCorrectExplanation: false,
    generatingIncorrectExplanations: [],
    completed: {
      question: false,
      options: [],
      correctExplanation: false,
      incorrectExplanations: [],
    },
  });
  const [generatingCorrectExplanationAudio, setGeneratingCorrectExplanationAudio] = useState(false);
  const [generatingIncorrectExplanationAudio, setGeneratingIncorrectExplanationAudio] = useState<number | null>(null);
  const [generatingAllAudio, setGeneratingAllAudio] = useState(false);
  const [generatingAllChapterAudio, setGeneratingAllChapterAudio] = useState(false);

  const [questionForm, setQuestionForm] = useState<Partial<QuizQuestion>>({
    question: "",
    options: ["", ""], // Start with minimum 2 options
    correctAnswer: 0,
    explanation: { correct: "", incorrect: [] },
    quizType: "chapter",
    order: 0,
  });

  const handleGenerateQuestionAudio = async () => {
    if (!questionForm.question || questionForm.question.trim().length === 0) {
      alert("Please enter a question first");
      return;
    }

    try {
      setGeneratingQuestionAudio(true);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingQuestion: true,
      }));
      
      const token = getToken();
      
      // Generate audio for question only
      const questionText = questionForm.question.trim();
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildAudioRequest(questionText, 'quiz')),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestionForm({
          ...questionForm,
          questionAudioUrl: data.audioUrl,
          questionTimestampsUrl: data.timestampsUrl,
        });
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
          completed: { ...prev.completed, question: true },
        }));
        alert(`✅ Question audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
      } else {
        const error = await response.json();
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
        }));
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating question audio:', err);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingQuestion: false,
      }));
      alert('Failed to generate question audio');
    } finally {
      setGeneratingQuestionAudio(false);
    }
  };

  const handleGenerateQuizAudio = async () => {
    if (!questionForm.question || questionForm.question.trim().length === 0) {
      alert("Please enter a question first");
      return;
    }
    if (!questionForm.options || questionForm.options.length < 2) {
      alert("Please enter at least 2 options");
      return;
    }

    try {
      setGeneratingQuizAudio(true);
      setQuizGenerationProgress({
        generatingQuestion: true,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: new Array(questionForm.options.length).fill(false),
          correctExplanation: false,
          incorrectExplanations: [],
        },
      });
      
      const token = getToken();
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;
      
      // Generate audio for question only
      const questionText = questionForm.question.trim();
      const questionResponse = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildAudioRequest(questionText, 'quiz')),
      });

      let questionAudioUrl: string | null = null;
      let questionTimestampsUrl: string | null = null;

      if (questionResponse.ok) {
        const questionData = await questionResponse.json();
        questionAudioUrl = questionData.audioUrl;
        questionTimestampsUrl = questionData.timestampsUrl;
        results.push(`✅ Question: ${questionData.audioUrl}`);
        successCount++;
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
          completed: { ...prev.completed, question: true },
        }));
      } else {
        const error = await questionResponse.json();
        results.push(`❌ Question: ${error.error || 'Unknown error'}`);
        failCount++;
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
        }));
      }

      // Generate audio for each option separately
      const optionAudioUrls: string[] = [];
      const optionTimestampsUrls: string[] = [];
      
      for (let optIdx = 0; optIdx < questionForm.options.length; optIdx++) {
        const optionText = questionForm.options[optIdx]?.trim();
        if (!optionText) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          setQuizGenerationProgress(prev => ({
            ...prev,
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
          continue;
        }

        // Update progress to show this option is being generated
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingOptions: [...prev.generatingOptions, optIdx],
        }));

        try {
          const optionResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(buildAudioRequest(optionText, 'quiz')),
          });

          if (optionResponse.ok) {
            const optionData = await optionResponse.json();
            optionAudioUrls.push(optionData.audioUrl);
            optionTimestampsUrls.push(optionData.timestampsUrl);
            results.push(`✅ Option ${optIdx + 1}: ${optionData.audioUrl}`);
            successCount++;
          } else {
            const error = await optionResponse.json();
            optionAudioUrls.push("");
            optionTimestampsUrls.push("");
            results.push(`❌ Option ${optIdx + 1}: ${error.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          results.push(`❌ Option ${optIdx + 1}: ${err.message || err}`);
          failCount++;
        } finally {
          // Update progress to show this option is completed
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingOptions: prev.generatingOptions.filter(idx => idx !== optIdx),
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
        }
      }

      setQuestionForm({
        ...questionForm,
        questionAudioUrl: questionAudioUrl || undefined,
        questionTimestampsUrl: questionTimestampsUrl || undefined,
        optionAudioUrls: optionAudioUrls,
        optionTimestampsUrls: optionTimestampsUrls,
      });
      
      alert(`✅ Quiz audio generation complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating quiz audio:', err);
      alert('Failed to generate quiz audio');
    } finally {
      setGeneratingQuizAudio(false);
      setQuizGenerationProgress({
        generatingQuestion: false,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: [],
          correctExplanation: false,
          incorrectExplanations: [],
        },
      });
    }
  };

  const handleGenerateCorrectExplanationAudio = async () => {
    if (!questionForm.explanation?.correct?.trim()) {
      alert("Please enter correct explanation first");
      return;
    }

    try {
      setGeneratingCorrectExplanationAudio(true);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingCorrectExplanation: true,
      }));
      
      const token = getToken();
      
      // Use only the explanation text, no title
      const explanationText = questionForm.explanation.correct.trim();
      
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildAudioRequest(explanationText, 'quiz')),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestionForm({
          ...questionForm,
          correctExplanationAudioUrl: data.audioUrl,
          correctExplanationTimestampsUrl: data.timestampsUrl,
        });
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingCorrectExplanation: false,
          completed: { ...prev.completed, correctExplanation: true },
        }));
        alert(`✅ Correct explanation audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
      } else {
        const error = await response.json();
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingCorrectExplanation: false,
        }));
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating correct explanation audio:', err);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingCorrectExplanation: false,
      }));
      alert('Failed to generate correct explanation audio');
    } finally {
      setGeneratingCorrectExplanationAudio(false);
    }
  };

  const handleGenerateIncorrectExplanationAudio = async (index: number) => {
    if (!questionForm.explanation?.incorrect || !questionForm.explanation.incorrect[index]?.trim()) {
      alert("Please enter incorrect explanation for this option first");
      return;
    }

    try {
      setGeneratingIncorrectExplanationAudio(index);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingIncorrectExplanations: [...prev.generatingIncorrectExplanations, index],
      }));
      
      const token = getToken();
      
      // Use only the explanation text, no title
      const explanationText = questionForm.explanation.incorrect[index].trim();
      
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildAudioRequest(explanationText, 'quiz')),
      });

      if (response.ok) {
        const data = await response.json();
        const currentIncorrectAudioUrls = (questionForm.incorrectExplanationAudioUrls || []) as string[];
        const currentIncorrectTimestampsUrls = (questionForm.incorrectExplanationTimestampsUrls || []) as string[];
        
        // Ensure arrays are long enough
        while (currentIncorrectAudioUrls.length <= index) {
          currentIncorrectAudioUrls.push("");
        }
        while (currentIncorrectTimestampsUrls.length <= index) {
          currentIncorrectTimestampsUrls.push("");
        }
        
        currentIncorrectAudioUrls[index] = data.audioUrl;
        currentIncorrectTimestampsUrls[index] = data.timestampsUrl;
        
        setQuestionForm({
          ...questionForm,
          incorrectExplanationAudioUrls: currentIncorrectAudioUrls,
          incorrectExplanationTimestampsUrls: currentIncorrectTimestampsUrls,
        });
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(idx => idx !== index),
          completed: {
            ...prev.completed,
            incorrectExplanations: prev.completed.incorrectExplanations.map((done, idx) => idx === index ? true : done),
          },
        }));
        alert(`✅ Incorrect explanation audio and timestamps generated successfully for option ${index + 1}!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
      } else {
        const error = await response.json();
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(idx => idx !== index),
        }));
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating incorrect explanation audio:', err);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(idx => idx !== index),
      }));
      alert('Failed to generate incorrect explanation audio');
    } finally {
      setGeneratingIncorrectExplanationAudio(null);
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!questionForm.question || !questionForm.question.trim()) {
      alert("Please enter a question first");
      return;
    }
    if (!questionForm.options || questionForm.options.length < 2) {
      alert("Please enter at least 2 options");
      return;
    }
    if (!questionForm.explanation?.correct?.trim()) {
      alert("Please enter correct explanation first");
      return;
    }
    // Check that we have explanations for all wrong options
    const options = questionForm.options || [];
    const correctAnswer = questionForm.correctAnswer || 0;
    const incorrectExplanations = questionForm.explanation?.incorrect || [];
    
    // Check if all wrong options have explanations
    const missingExplanations: number[] = [];
    for (let i = 0; i < options.length; i++) {
      if (i !== correctAnswer) {
        // Ensure array is long enough
        while (incorrectExplanations.length <= i) {
          incorrectExplanations.push("");
        }
        if (!incorrectExplanations[i] || !incorrectExplanations[i].trim()) {
          missingExplanations.push(i + 1);
        }
      }
    }
    
    if (missingExplanations.length > 0) {
      alert(`Please enter explanations for all incorrect answer options.\nMissing explanations for: Options ${missingExplanations.join(", ")}`);
      return;
    }

    try {
      setGeneratingAllAudio(true);
      // Initialize progress with arrays sized for all options (mapped by option index)
      setQuizGenerationProgress({
        generatingQuestion: true,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: new Array(options.length).fill(false),
          correctExplanation: false,
          incorrectExplanations: new Array(options.length).fill(false), // Mapped by option index
        },
      });
      
      const token = getToken();
      const results: string[] = [];

      // 1. Generate separate audio for question and each option
      const questionText = questionForm.question.trim();
      
      // Generate audio for question only
      try {
        const questionResponse = await fetch('/api/admin/generate-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildAudioRequest(questionText, 'quiz')),
        });

        if (questionResponse.ok) {
          const questionData = await questionResponse.json();
          results.push(`✅ Question: ${questionData.audioUrl}`);
          setQuestionForm(prev => ({
            ...prev,
            questionAudioUrl: questionData.audioUrl,
            questionTimestampsUrl: questionData.timestampsUrl,
          }));
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingQuestion: false,
            completed: { ...prev.completed, question: true },
          }));
        } else {
          const error = await questionResponse.json();
          results.push(`❌ Question failed: ${error.error || 'Unknown error'}`);
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingQuestion: false,
          }));
        }
      } catch (err) {
        results.push(`❌ Question error: ${err}`);
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
        }));
      }

      // Generate audio for each option separately
      const optionAudioUrls: string[] = [];
      const optionTimestampsUrls: string[] = [];
      
      for (let optIdx = 0; optIdx < questionForm.options.length; optIdx++) {
        const optionText = questionForm.options[optIdx]?.trim();
        if (!optionText) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          setQuizGenerationProgress(prev => ({
            ...prev,
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
          continue;
        }

        // Update progress to show this option is being generated
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingOptions: [...prev.generatingOptions, optIdx],
        }));

        try {
          const optionResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(buildAudioRequest(optionText, 'quiz')),
          });

          if (optionResponse.ok) {
            const optionData = await optionResponse.json();
            optionAudioUrls.push(optionData.audioUrl);
            optionTimestampsUrls.push(optionData.timestampsUrl);
            results.push(`✅ Option ${optIdx + 1}: ${optionData.audioUrl}`);
          } else {
            const error = await optionResponse.json();
            optionAudioUrls.push("");
            optionTimestampsUrls.push("");
            results.push(`❌ Option ${optIdx + 1} failed: ${error.error || 'Unknown error'}`);
          }
        } catch (err) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          results.push(`❌ Option ${optIdx + 1} error: ${err}`);
        } finally {
          // Update progress to show this option is completed
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingOptions: prev.generatingOptions.filter(idx => idx !== optIdx),
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
        }
      }

      // Update form with option audio URLs
      setQuestionForm(prev => ({
        ...prev,
        optionAudioUrls: optionAudioUrls,
        optionTimestampsUrls: optionTimestampsUrls,
      }));

      // 2. Generate correct explanation audio
      const correctText = questionForm.explanation.correct.trim();
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingCorrectExplanation: true,
      }));
      
      try {
        const correctResponse = await fetch('/api/admin/generate-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildAudioRequest(correctText, 'quiz')),
        });

        if (correctResponse.ok) {
          const correctData = await correctResponse.json();
          results.push(`✅ Correct explanation audio: ${correctData.audioUrl}`);
          setQuestionForm(prev => ({
            ...prev,
            correctExplanationAudioUrl: correctData.audioUrl,
            correctExplanationTimestampsUrl: correctData.timestampsUrl,
          }));
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingCorrectExplanation: false,
            completed: { ...prev.completed, correctExplanation: true },
          }));
        } else {
          const error = await correctResponse.json();
          results.push(`❌ Correct explanation audio failed: ${error.error || 'Unknown error'}`);
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingCorrectExplanation: false,
          }));
        }
      } catch (err) {
        results.push(`❌ Correct explanation audio error: ${err}`);
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingCorrectExplanation: false,
        }));
      }

      // 3. Generate incorrect explanation audio for each wrong option (mapped by option index)
      const incorrectTexts = questionForm.explanation.incorrect || [];
      // Use options and correctAnswer already declared at the top of the function
      
      // Initialize arrays with empty strings for all options (indexed by option index)
      const incorrectAudioUrls: string[] = new Array(options.length).fill("");
      const incorrectTimestampsUrls: string[] = new Array(options.length).fill("");

      // Generate audio only for wrong options
      for (let optionIdx = 0; optionIdx < options.length; optionIdx++) {
        // Skip the correct answer
        if (optionIdx === correctAnswer) {
          continue;
        }
        
        // Ensure array is long enough
        while (incorrectTexts.length <= optionIdx) {
          incorrectTexts.push("");
        }
        
        const incorrectText = incorrectTexts[optionIdx]?.trim();
        if (!incorrectText) {
          setQuizGenerationProgress(prev => ({
            ...prev,
            completed: {
              ...prev.completed,
              incorrectExplanations: prev.completed.incorrectExplanations.map((done, i) => i === optionIdx ? true : done),
            },
          }));
          continue;
        }

        // Update progress to show this incorrect explanation is being generated
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingIncorrectExplanations: [...prev.generatingIncorrectExplanations, optionIdx],
        }));

        try {
          const incorrectResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(buildAudioRequest(incorrectText, 'quiz')),
          });

          if (incorrectResponse.ok) {
            const incorrectData = await incorrectResponse.json();
            incorrectAudioUrls[optionIdx] = incorrectData.audioUrl;
            incorrectTimestampsUrls[optionIdx] = incorrectData.timestampsUrl;
            results.push(`✅ Option ${optionIdx + 1} incorrect explanation audio: ${incorrectData.audioUrl}`);
          } else {
            const error = await incorrectResponse.json();
            incorrectAudioUrls[optionIdx] = "";
            incorrectTimestampsUrls[optionIdx] = "";
            results.push(`❌ Option ${optionIdx + 1} incorrect explanation audio failed: ${error.error || 'Unknown error'}`);
          }
        } catch (err) {
          incorrectAudioUrls[optionIdx] = "";
          incorrectTimestampsUrls[optionIdx] = "";
          results.push(`❌ Option ${optionIdx + 1} incorrect explanation audio error: ${err}`);
        } finally {
          // Update progress to show this incorrect explanation is completed
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(i => i !== optionIdx),
            completed: {
              ...prev.completed,
              incorrectExplanations: prev.completed.incorrectExplanations.map((done, i) => i === optionIdx ? true : done),
            },
          }));
        }
      }

      // Get the latest form state with all generated audio URLs
      const finalQuestionAudioUrl = questionForm.questionAudioUrl;
      const finalQuestionTimestampsUrl = questionForm.questionTimestampsUrl;
      const finalCorrectExplanationAudioUrl = questionForm.correctExplanationAudioUrl;
      const finalCorrectExplanationTimestampsUrl = questionForm.correctExplanationTimestampsUrl;

      // Update form with all incorrect audio URLs
      setQuestionForm(prev => ({
        ...prev,
        incorrectExplanationAudioUrls: incorrectAudioUrls,
        incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
      }));

      // Auto-save the question after generating all audio
      // Get the current question ID if editing, or save as new
      const currentQuestionId = editingQuestion;
      
      if (currentQuestionId) {
        // Update existing question with all generated audio URLs
        try {
          const saveResponse = await fetch(`/api/admin/quiz-questions/${currentQuestionId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              question: questionForm.question,
              options: questionForm.options,
              correctAnswer: questionForm.correctAnswer,
              explanation: questionForm.explanation,
              chapterId: chapterId === "new" ? null : chapterId,
              quizType: questionForm.quizType,
              order: questionForm.order,
              // Include all audio URLs
              questionAudioUrl: finalQuestionAudioUrl,
              questionTimestampsUrl: finalQuestionTimestampsUrl,
              optionAudioUrls: optionAudioUrls,
              optionTimestampsUrls: optionTimestampsUrls,
              correctExplanationAudioUrl: finalCorrectExplanationAudioUrl,
              correctExplanationTimestampsUrl: finalCorrectExplanationTimestampsUrl,
              incorrectExplanationAudioUrls: incorrectAudioUrls,
              incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
            }),
          });

          if (saveResponse.ok) {
            await fetchChapter();
            results.push(`\n✅ Question automatically saved with all audio URLs`);
          } else {
            const saveError = await saveResponse.json();
            results.push(`\n⚠️ Audio generated but failed to auto-save: ${saveError.error || 'Unknown error'}`);
            results.push(`⚠️ Please click "Save Question" to save the generated audio URLs`);
          }
        } catch (saveErr) {
          console.error('Error auto-saving question:', saveErr);
          results.push(`\n⚠️ Audio generated but failed to auto-save. Please click "Save Question" to save the generated audio URLs`);
        }
      } else {
        // New question - prompt user to save
        results.push(`\n⚠️ Please click "Save Question" to save the question with generated audio URLs`);
      }

      // Show summary alert
      const successCount = results.filter(r => r.startsWith('✅')).length;
      const failCount = results.filter(r => r.startsWith('❌')).length;
      alert(`Audio Generation Complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating all audio:', err);
      alert('Failed to generate all audio');
    } finally {
      setGeneratingAllAudio(false);
      setQuizGenerationProgress({
        generatingQuestion: false,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: [],
          correctExplanation: false,
          incorrectExplanations: [],
        },
      });
    }
  };

  const handleSaveQuestion = async (questionId?: string) => {
    try {
      const token = getToken();
      const url = questionId
        ? `/api/admin/quiz-questions/${questionId}`
        : `/api/admin/quiz-questions`;
      const method = questionId ? "PUT" : "POST";

      // Explicitly include all audio URL fields to ensure they're saved
      const saveData = {
        question: questionForm.question,
        options: questionForm.options,
        correctAnswer: questionForm.correctAnswer,
        explanation: questionForm.explanation,
        chapterId: chapterId === "new" ? null : chapterId,
        quizType: questionForm.quizType,
        order: questionForm.order,
        // Include all audio URLs explicitly
        audioUrl: questionForm.audioUrl || null,
        timestampsUrl: questionForm.timestampsUrl || null,
        questionAudioUrl: questionForm.questionAudioUrl || null,
        questionTimestampsUrl: questionForm.questionTimestampsUrl || null,
        optionAudioUrls: questionForm.optionAudioUrls || null,
        optionTimestampsUrls: questionForm.optionTimestampsUrls || null,
        explanationAudioUrl: questionForm.explanationAudioUrl || null,
        explanationTimestampsUrl: questionForm.explanationTimestampsUrl || null,
        correctExplanationAudioUrl: questionForm.correctExplanationAudioUrl || null,
        correctExplanationTimestampsUrl: questionForm.correctExplanationTimestampsUrl || null,
        incorrectExplanationAudioUrls: questionForm.incorrectExplanationAudioUrls || null,
        incorrectExplanationTimestampsUrls: questionForm.incorrectExplanationTimestampsUrls || null,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Saving question with audio URLs:', {
          questionId,
          correctExplanationAudioUrl: saveData.correctExplanationAudioUrl,
          incorrectExplanationAudioUrls: saveData.incorrectExplanationAudioUrls,
        });
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        await fetchChapter();
        setShowQuestionForm(false);
        setEditingQuestion(null);
        setQuestionForm({
          question: "",
          options: ["", ""], // Start with minimum 2 options
          correctAnswer: 0,
          explanation: { correct: "", incorrect: [] },
          quizType: "chapter",
          order: 0,
        });
        alert("Question saved successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to save question: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error saving question:", err);
      alert("Failed to save question. Please try again.");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/quiz-questions/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchChapter();
      }
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  const startEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question.id);
    
    // Ensure incorrect explanations array is properly sized for all options (mapped by option index)
    const options = question.options || [];
    const incorrectExplanations = question.explanation?.incorrect || [];
    // Ensure array is long enough for all options (mapped by option index)
    while (incorrectExplanations.length < options.length) {
      incorrectExplanations.push("");
    }
    
    // Ensure audio URL arrays are properly sized (mapped by option index)
    const incorrectAudioUrls = (question.incorrectExplanationAudioUrls as string[] || []);
    const incorrectTimestampsUrls = (question.incorrectExplanationTimestampsUrls as string[] || []);
    while (incorrectAudioUrls.length < options.length) {
      incorrectAudioUrls.push("");
    }
    while (incorrectTimestampsUrls.length < options.length) {
      incorrectTimestampsUrls.push("");
    }
    
    setQuestionForm({
      ...question,
      explanation: {
        ...question.explanation,
        incorrect: incorrectExplanations,
      },
      incorrectExplanationAudioUrls: incorrectAudioUrls,
      incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
    });
    setShowQuestionForm(true);
    
    // Initialize progress state when editing a question
    setQuizGenerationProgress({
      generatingQuestion: false,
      generatingOptions: [],
      generatingCorrectExplanation: false,
      generatingIncorrectExplanations: [],
      completed: {
        question: !!question.questionAudioUrl,
        options: (question.optionAudioUrls as string[] || []).map(url => !!url),
        correctExplanation: !!question.correctExplanationAudioUrl,
        incorrectExplanations: incorrectAudioUrls.map(url => !!url),
      },
    });
  };


  // Generate all audio for entire chapter
  const handleGenerateAllChapterAudio = async () => {
    if (!chapter) {
      alert("Chapter not loaded");
      return;
    }

    try {
      setGeneratingAllChapterAudio(true);
      const token = getToken();
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;

      // 1. Generate audio for all sections
      for (const section of sections) {
        if (!section.text || section.text.trim().length === 0) {
          results.push(`⏭️ Section "${section.title}": Skipped (no text)`);
          continue;
        }

        try {
          const response = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(buildAudioRequest(section.text.trim(), 'section')),
          });

          if (response.ok) {
            const data = await response.json();
            // Update section with generated audio - only update audio fields
            const updateResponse = await fetch(`/api/admin/sections/${section.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                sectionNumber: section.sectionNumber,
                title: section.title,
                text: section.text,
                type: section.type,
                order: section.order,
                audioUrl: data.audioUrl,
                timestampsUrl: data.timestampsUrl,
                imageUrl: section.imageUrl || null,
              }),
            });

            if (updateResponse.ok) {
              results.push(`✅ Section "${section.title}": ${data.audioUrl}`);
              successCount++;
            } else {
              const updateError = await updateResponse.json();
              results.push(`❌ Section "${section.title}": Generated but failed to update - ${updateError.error || 'Unknown error'}`);
              failCount++;
            }
          } else {
            const error = await response.json();
            results.push(`❌ Section "${section.title}": ${error.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          results.push(`❌ Section "${section.title}": ${err.message || err}`);
          failCount++;
        }
      }

      // 2. Generate audio for all quiz questions
      for (const question of quizQuestions) {
        if (!question.question || !question.options || question.options.length < 2) {
          results.push(`⏭️ Question: Skipped (incomplete)`);
          continue;
        }

        // Fetch latest question data to avoid stale data issues
        let currentQuestion = question;
        try {
          const questionFetchResponse = await fetch(`/api/admin/quiz-questions/${question.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (questionFetchResponse.ok) {
            const questionData = await questionFetchResponse.json();
            currentQuestion = questionData.question;
          }
        } catch (err) {
          console.warn(`Failed to fetch latest question data for ${question.id}, using cached data`);
        }

        // Generate separate audio for question and each option
        try {
          const questionText = currentQuestion.question.trim();
          
          // Generate audio for question only
          const questionResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(buildAudioRequest(questionText, 'quiz')),
          });

          let questionAudioUrl: string | null = null;
          let questionTimestampsUrl: string | null = null;

          if (questionResponse.ok) {
            const questionData = await questionResponse.json();
            questionAudioUrl = questionData.audioUrl;
            questionTimestampsUrl = questionData.timestampsUrl;
            results.push(`✅ Question Text: ${questionData.audioUrl}`);
            successCount++;
          } else {
            const error = await questionResponse.json();
            results.push(`❌ Question Text: ${error.error || 'Unknown error'}`);
            failCount++;
          }

          // Generate audio for each option separately
          const optionAudioUrls: string[] = [];
          const optionTimestampsUrls: string[] = [];
          
          for (let optIdx = 0; optIdx < currentQuestion.options.length; optIdx++) {
            const optionText = currentQuestion.options[optIdx]?.trim();
            if (!optionText) {
              optionAudioUrls.push("");
              optionTimestampsUrls.push("");
              continue;
            }

            try {
              const optionResponse = await fetch('/api/admin/generate-audio', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(buildAudioRequest(optionText, 'quiz')),
              });

              if (optionResponse.ok) {
                const optionData = await optionResponse.json();
                optionAudioUrls.push(optionData.audioUrl);
                optionTimestampsUrls.push(optionData.timestampsUrl);
                results.push(`  ✅ Option ${optIdx + 1}: ${optionData.audioUrl}`);
                successCount++;
              } else {
                const error = await optionResponse.json();
                optionAudioUrls.push("");
                optionTimestampsUrls.push("");
                results.push(`  ❌ Option ${optIdx + 1}: ${error.error || 'Unknown error'}`);
                failCount++;
              }
            } catch (err: any) {
              optionAudioUrls.push("");
              optionTimestampsUrls.push("");
              results.push(`  ❌ Option ${optIdx + 1}: ${err.message || err}`);
              failCount++;
            }
          }

          // Update question with all audio URLs
          const updateResponse = await fetch(`/api/admin/quiz-questions/${currentQuestion.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              question: currentQuestion.question,
              options: currentQuestion.options,
              correctAnswer: currentQuestion.correctAnswer,
              explanation: currentQuestion.explanation,
              chapterId: currentQuestion.chapterId,
              quizType: currentQuestion.quizType,
              order: currentQuestion.order,
              questionAudioUrl: questionAudioUrl,
              questionTimestampsUrl: questionTimestampsUrl,
              optionAudioUrls: optionAudioUrls,
              optionTimestampsUrls: optionTimestampsUrls,
            }),
          });

          if (updateResponse.ok) {
            // Update currentQuestion with new audio URLs
            currentQuestion = { 
              ...currentQuestion, 
              questionAudioUrl: questionAudioUrl || undefined,
              questionTimestampsUrl: questionTimestampsUrl || undefined,
              optionAudioUrls: optionAudioUrls,
              optionTimestampsUrls: optionTimestampsUrls,
            };
          } else {
            const updateError = await updateResponse.json();
            results.push(`❌ Question Update Failed: ${updateError.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          results.push(`❌ Question "${currentQuestion.question.substring(0, 30)}...": ${err.message || err}`);
          failCount++;
        }

        // Generate correct explanation audio
        if (currentQuestion.explanation?.correct?.trim()) {
          try {
            const correctResponse = await fetch('/api/admin/generate-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(buildAudioRequest(currentQuestion.explanation.correct.trim(), 'quiz')),
            });

            if (correctResponse.ok) {
              const correctData = await correctResponse.json();
              
              // Update question with correct explanation audio - only update explanation audio fields
              const updateResponse = await fetch(`/api/admin/quiz-questions/${currentQuestion.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  question: currentQuestion.question,
                  options: currentQuestion.options,
                  correctAnswer: currentQuestion.correctAnswer,
                  explanation: currentQuestion.explanation,
                  chapterId: currentQuestion.chapterId,
                  quizType: currentQuestion.quizType,
                  order: currentQuestion.order,
                  audioUrl: currentQuestion.audioUrl,
                  timestampsUrl: currentQuestion.timestampsUrl,
                  correctExplanationAudioUrl: correctData.audioUrl,
                  correctExplanationTimestampsUrl: correctData.timestampsUrl,
                }),
              });

              if (updateResponse.ok) {
                results.push(`  ✅ Correct Explanation: ${correctData.audioUrl}`);
                successCount++;
                // Update currentQuestion with new explanation audio URLs
                currentQuestion = { 
                  ...currentQuestion, 
                  correctExplanationAudioUrl: correctData.audioUrl, 
                  correctExplanationTimestampsUrl: correctData.timestampsUrl 
                };
              } else {
                const updateError = await updateResponse.json();
                results.push(`  ❌ Correct Explanation: Failed to update - ${updateError.error || 'Unknown error'}`);
                failCount++;
              }
            } else {
              const error = await correctResponse.json();
              results.push(`  ❌ Correct Explanation: ${error.error || 'Unknown error'}`);
              failCount++;
            }
          } catch (err: any) {
            results.push(`  ❌ Correct Explanation: ${err.message || err}`);
            failCount++;
          }
        }

        // Generate incorrect explanation audio for each option
        if (currentQuestion.explanation?.incorrect && currentQuestion.explanation.incorrect.length > 0) {
          const incorrectAudioUrls: string[] = [];
          const incorrectTimestampsUrls: string[] = [];
          let hasValidAudio = false;

          for (let idx = 0; idx < currentQuestion.explanation.incorrect.length; idx++) {
            const incorrectText = currentQuestion.explanation.incorrect[idx]?.trim();
            if (!incorrectText) {
              incorrectAudioUrls.push("");
              incorrectTimestampsUrls.push("");
              continue;
            }

            try {
              const incorrectResponse = await fetch('/api/admin/generate-audio', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(buildAudioRequest(incorrectText, 'quiz')),
              });

              if (incorrectResponse.ok) {
                const incorrectData = await incorrectResponse.json();
                incorrectAudioUrls.push(incorrectData.audioUrl);
                incorrectTimestampsUrls.push(incorrectData.timestampsUrl);
                results.push(`  ✅ Option ${idx + 1} Incorrect Explanation: ${incorrectData.audioUrl}`);
                successCount++;
                hasValidAudio = true;
              } else {
                const error = await incorrectResponse.json();
                incorrectAudioUrls.push("");
                incorrectTimestampsUrls.push("");
                results.push(`  ❌ Option ${idx + 1} Incorrect Explanation: ${error.error || 'Unknown error'}`);
                failCount++;
              }
            } catch (err: any) {
              incorrectAudioUrls.push("");
              incorrectTimestampsUrls.push("");
              results.push(`  ❌ Option ${idx + 1} Incorrect Explanation: ${err.message || err}`);
              failCount++;
            }
          }

          // Update question with incorrect explanation audio URLs - only if we have valid audio
          if (hasValidAudio && incorrectAudioUrls.length > 0) {
            try {
              const updateResponse = await fetch(`/api/admin/quiz-questions/${currentQuestion.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  question: currentQuestion.question,
                  options: currentQuestion.options,
                  correctAnswer: currentQuestion.correctAnswer,
                  explanation: currentQuestion.explanation,
                  chapterId: currentQuestion.chapterId,
                  quizType: currentQuestion.quizType,
                  order: currentQuestion.order,
                  audioUrl: currentQuestion.audioUrl,
                  timestampsUrl: currentQuestion.timestampsUrl,
                  correctExplanationAudioUrl: currentQuestion.correctExplanationAudioUrl,
                  correctExplanationTimestampsUrl: currentQuestion.correctExplanationTimestampsUrl,
                  incorrectExplanationAudioUrls: incorrectAudioUrls,
                  incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
                }),
              });

              if (!updateResponse.ok) {
                const updateError = await updateResponse.json();
                results.push(`  ⚠️ Failed to update incorrect explanation URLs: ${updateError.error || 'Unknown error'}`);
              }
            } catch (err: any) {
              results.push(`  ⚠️ Failed to update incorrect explanation URLs: ${err.message || err}`);
            }
          }
        }
      }

      // Refresh chapter data
      await fetchChapter();

      // Show summary
      alert(`Chapter Audio Generation Complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating all chapter audio:', err);
      alert('Failed to generate all chapter audio');
    } finally {
      setGeneratingAllChapterAudio(false);
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
          <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2 break-words">
            {chapter ? `Chapter ${chapter.number}: ${chapter.title}` : "New Chapter"}
          </h1>
          {chapter && (
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mt-4 flex-wrap">
              <Link
                href={`/chapter/${chapter.number}`}
                target="_blank"
                className="px-3 md:px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all text-xs md:text-sm text-center"
              >
                👁️ View Live Page
              </Link>
              <button
                onClick={async () => {
                  await fetchChapter();
                  alert("Content refreshed! Changes should be visible on the website now.");
                }}
                className="px-3 md:px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-all text-xs md:text-sm"
              >
                🔄 Refresh Content
              </button>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowTTSSettings(true)}
                  className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all text-xs md:text-sm"
                  title="TTS Settings"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={handleGenerateAllChapterAudio}
                  disabled={generatingAllChapterAudio}
                  className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-xs md:text-sm"
                >
                  {generatingAllChapterAudio ? "🔄 Generating..." : "🎙️ Generate All Audio"}
                </button>
              </div>
              <button
                onClick={() => setEditingChapterInfo(!editingChapterInfo)}
                className="px-3 md:px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all text-xs md:text-sm"
              >
                {editingChapterInfo ? "✖️ Cancel Edit" : "✏️ Edit Chapter Info"}
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete Chapter ${chapter.number}: ${chapter.title}? This will also delete all sections and quiz questions. This action cannot be undone!`)) {
                    try {
                      const token = getToken();
                      const response = await fetch(`/api/admin/chapters/${chapter.id}`, {
                        method: "DELETE",
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      
                      if (response.ok) {
                        alert("Chapter deleted successfully!");
                        router.push("/admin");
                      } else {
                        const error = await response.json();
                        alert(`Error: ${error.error || "Failed to delete chapter"}`);
                      }
                    } catch (err) {
                      console.error("Error deleting chapter:", err);
                      alert("Failed to delete chapter");
                    }
                  }
                }}
                className="px-3 md:px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-xs md:text-sm"
              >
                🗑️ Delete Chapter
              </button>
            </div>
          )}
        </div>

        {/* Chapter Info Edit Form */}
        {chapter && editingChapterInfo && (
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Edit Chapter Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chapter Title *
                </label>
                <input
                  type="text"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Enter chapter title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <RichTextEditor
                  value={chapterForm.description || ""}
                  onChange={(value) => setChapterForm({ ...chapterForm, description: value })}
                  rows={3}
                  placeholder="Enter chapter description (optional)"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    try {
                      const token = getToken();
                      const response = await fetch(`/api/admin/chapters/${chapter.id}`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          number: chapter.number,
                          title: chapterForm.title,
                          description: chapterForm.description || null,
                        }),
                      });

                      if (response.ok) {
                        await fetchChapter();
                        setEditingChapterInfo(false);
                        alert("Chapter information updated successfully!");
                      } else {
                        const error = await response.json();
                        alert(`Error: ${error.error || "Failed to update chapter"}`);
                      }
                    } catch (err) {
                      console.error("Error updating chapter:", err);
                      alert("Failed to update chapter");
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => {
                    setChapterForm({
                      title: chapter?.title || "",
                      description: chapter?.description || "",
                    });
                    setEditingChapterInfo(false);
                  }}
                  className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chapter Info Display (when not editing) */}
        {chapter && !editingChapterInfo && (
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Chapter Information</h2>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400 text-sm">Title:</span>
                    <p className="text-white text-lg font-semibold">{chapter.title}</p>
                  </div>
                  {chapter.description && (
                    <div>
                      <span className="text-gray-400 text-sm">Description:</span>
                      <p className="text-white">{chapter.description}</p>
                    </div>
                  )}
                  {!chapter.description && (
                    <p className="text-gray-500 text-sm italic">No description set</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sections List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-white">Sections</h2>
            <button
              onClick={() => {
                setShowSectionForm(true);
                setEditingSection(null);
                // Calculate next section number based on existing sections
                const maxSectionNumber = sections.length > 0 
                  ? Math.max(...sections.map(s => s.sectionNumber || 0))
                  : 0;
                setSectionForm({
                  sectionNumber: maxSectionNumber + 1,
                  title: "",
                  text: "",
                  type: "content",
                  audioUrl: "",
                  timestampsUrl: "",
                  imageUrl: "",
                  order: sections.length,
                });
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 text-sm md:text-base w-full sm:w-auto text-center"
            >
              + New Section
            </button>
          </div>

          <div className="space-y-4">
            {sections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No sections yet</p>
                <p className="text-xs mt-1">Add sections to display chapter content</p>
              </div>
            ) : (
              sections.map((section) => (
                <div
                  key={section.id}
                  className="p-3 md:p-4 bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                        {section.title}
                      </h3>
                      {section.text && (
                        <p className="text-gray-400 text-xs md:text-sm mb-2 line-clamp-2">
                          {section.text}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-gray-500">
                        <span>Type: {section.type}</span>
                        <span>Section #: {section.sectionNumber}</span>
                        <span>Order: {section.order}</span>
                        {section.audioUrl && <span>Audio: ✓</span>}
                        {section.timestampsUrl && <span>Timestamps: ✓</span>}
                        {section.imageUrl && <span>Image: ✓</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4">
                      <button
                        onClick={() => startEditSection(section)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>


        {/* Quiz Questions List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-white">Quiz Questions</h2>
            <button
              onClick={() => {
                setShowQuestionForm(true);
                setEditingQuestion(null);
                setQuestionForm({
                  question: "",
                  options: ["", ""], // Start with minimum 2 options
                  correctAnswer: 0,
                  explanation: { correct: "", incorrect: [] },
                  quizType: "chapter",
                  order: quizQuestions.length,
                });
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-sm md:text-base w-full sm:w-auto text-center"
            >
              + New Question
            </button>
          </div>

          <div className="space-y-4">
            {quizQuestions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No quiz questions yet</p>
                <p className="text-xs mt-1">Add questions to test student knowledge</p>
              </div>
            ) : (
              quizQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-3 md:p-4 bg-[#0a0e27]/50 border border-purple-500/20 rounded-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                        {question.question}
                      </h3>
                      <div className="space-y-1 mb-2">
                        {question.options.map((option, idx) => (
                          <div
                            key={idx}
                            className={`text-xs md:text-sm ${
                              idx === question.correctAnswer
                                ? "text-green-400 font-semibold"
                                : "text-gray-400"
                            }`}
                          >
                            {idx === question.correctAnswer ? "✓ " : "  "}
                            {option}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Correct Answer: Option {question.correctAnswer + 1} | Order: {question.order}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4">
                      <button
                        onClick={() => startEditQuestion(question)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 hover:bg-purple-500/30 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section Form Modal */}
        {showSectionForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-cyan-500/20 p-4 md:p-6 w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                {editingSection ? "Edit Section" : "New Section"}
              </h2>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Section Number
                  </label>
                  <input
                    type="number"
                    value={sectionForm.sectionNumber || ""}
                    onChange={(e) =>
                      setSectionForm({
                        ...sectionForm,
                        sectionNumber: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={sectionForm.title || ""}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, title: e.target.value })
                    }
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Type
                  </label>
                  <select
                    value={sectionForm.type || "content"}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, type: e.target.value })
                    }
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  >
                    <option value="content">Content</option>
                  </select>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-300">
                      Text Content
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowTTSSettings(true)}
                        className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
                        title="TTS Settings"
                      >
                        ⚙️ Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateAudio(sectionForm.text || "")}
                        disabled={generatingAudio || !sectionForm.text || sectionForm.text.trim().length === 0}
                        className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {generatingAudio ? "🔄 Generating..." : "🎙️ Generate Audio & Timestamps"}
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={sectionForm.text || ""}
                    onChange={(value) =>
                      setSectionForm({ ...sectionForm, text: value })
                    }
                    rows={8}
                    placeholder="Enter section text content..."
                  />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-1">
                    <p className="text-xs text-gray-400">
                      Enter your text and click "Generate Audio & Timestamps" to automatically create audio and timestamp files using Inworld AI
                    </p>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        stripHTML(sectionForm.text || "").length > 2000
                          ? "text-red-400"
                          : stripHTML(sectionForm.text || "").length > 1800
                          ? "text-yellow-400"
                          : "text-gray-400"
                      }`}
                    >
                      {stripHTML(sectionForm.text || "").length} / 2000 characters
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Audio URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={sectionForm.audioUrl || ""}
                      onChange={(e) =>
                        setSectionForm({ ...sectionForm, audioUrl: e.target.value })
                      }
                      className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                      placeholder="/audio/chapter1-section1.mp3"
                    />
                    <label className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center whitespace-nowrap">
                      {uploadingAudio ? "Uploading..." : "📁 Upload"}
                      <input
                        type="file"
                        accept=".mp3,audio/mpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'audio');
                          }
                        }}
                        disabled={uploadingAudio}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Upload MP3 file or enter URL manually</p>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Timestamps URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={sectionForm.timestampsUrl || ""}
                      onChange={(e) =>
                        setSectionForm({
                          ...sectionForm,
                          timestampsUrl: e.target.value,
                        })
                      }
                      className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                      placeholder="/timestamps/chapter1-section1.timestamps.json"
                    />
                    <label className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center whitespace-nowrap">
                      {uploadingTimestamps ? "Uploading..." : "📁 Upload"}
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'timestamps');
                          }
                        }}
                        disabled={uploadingTimestamps}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Upload JSON file or enter URL manually</p>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Section Image
                  </label>
                  {sectionForm.imageUrl ? (
                    <div className="mb-3">
                      <div className="relative inline-block">
                        <img
                          src={sectionForm.imageUrl}
                          alt="Section preview"
                          className="max-w-full h-auto max-h-48 md:max-h-64 rounded-lg border border-cyan-500/30 shadow-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 md:p-2 shadow-lg transition-all"
                          title="Remove image"
                        >
                          <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={sectionForm.imageUrl || ""}
                      onChange={(e) =>
                        setSectionForm({ ...sectionForm, imageUrl: e.target.value })
                      }
                      className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                      placeholder="/images/chapter1-section1.jpg"
                    />
                    <label className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center whitespace-nowrap">
                      {uploadingImage ? "Uploading..." : "🖼️ Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (max 10MB)
                            if (file.size > 10 * 1024 * 1024) {
                              alert('Image size must be less than 10MB');
                              return;
                            }
                            handleFileUpload(file, 'image');
                          }
                        }}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Upload image file (JPG, PNG, GIF, WebP) or enter URL manually. Image will be displayed below the text content.</p>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={sectionForm.order || 0}
                    onChange={(e) =>
                      setSectionForm({
                        ...sectionForm,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mt-4 md:mt-6">
                <button
                  onClick={() => handleSaveSection(editingSection || undefined)}
                  className="flex-1 px-4 py-2.5 text-sm md:text-base bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSectionForm(false);
                    setEditingSection(null);
                  }}
                  className="px-4 py-2.5 text-sm md:text-base bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Form Modal */}
        {showQuestionForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-purple-500/20 p-4 md:p-6 w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                {editingQuestion ? "Edit Question" : "New Question"}
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-300">
                      Question
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowTTSSettings(true)}
                        className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
                        title="TTS Settings"
                      >
                        ⚙️ Settings
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateQuestionAudio}
                        disabled={generatingQuestionAudio || !questionForm.question || questionForm.question.trim().length === 0}
                        className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {generatingQuestionAudio ? "🔄 Generating..." : "🎙️ Generate Audio"}
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={questionForm.question || ""}
                    onChange={(value) =>
                      setQuestionForm({ ...questionForm, question: value })
                    }
                    rows={3}
                    placeholder="Enter the question text..."
                  />
                  {/* Progress indicator for question */}
                  {generatingQuestionAudio && (
                    <div className="mt-2 text-xs">
                      <p className="text-yellow-400 animate-pulse">
                        🔄 Generating question audio...
                      </p>
                    </div>
                  )}
                  {quizGenerationProgress.completed.question && !generatingQuestionAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Question audio generated
                    </p>
                  )}
                  {questionForm.questionAudioUrl && questionForm.questionTimestampsUrl && !generatingQuestionAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Question: Audio & Timestamps ready
                    </p>
                  )}
                  {questionForm.audioUrl && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Legacy combined audio: {questionForm.audioUrl} (use separate question/option audio instead)
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-300">
                      Answer Options (select correct answer with radio button)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = [...(questionForm.options || []), ""];
                        setQuestionForm({ ...questionForm, options: newOptions });
                      }}
                      className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all whitespace-nowrap"
                    >
                      + Add Option
                    </button>
                  </div>
                  {(questionForm.options || []).map((option, idx) => {
                    const isGenerating = quizGenerationProgress.generatingOptions.includes(idx);
                    const isCompleted = quizGenerationProgress.completed.options[idx];
                    const optionAudioUrls = (questionForm.optionAudioUrls || []) as string[];
                    const optionTimestampsUrls = (questionForm.optionTimestampsUrls || []) as string[];
                    const hasAudio = optionAudioUrls[idx] && optionTimestampsUrls[idx];
                    
                    return (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={questionForm.correctAnswer === idx}
                            onChange={() =>
                              setQuestionForm({ ...questionForm, correctAnswer: idx })
                            }
                            className="w-4 h-4 text-purple-500 flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(questionForm.options || [])];
                              newOptions[idx] = e.target.value;
                              setQuestionForm({ ...questionForm, options: newOptions });
                            }}
                            className="flex-1 min-w-0 px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                            placeholder={`Option ${idx + 1}`}
                          />
                          {(questionForm.options || []).length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = [...(questionForm.options || [])];
                                newOptions.splice(idx, 1);
                                // Adjust correctAnswer if needed
                                let newCorrectAnswer = questionForm.correctAnswer || 0;
                                if (newCorrectAnswer === idx) {
                                  // If removing the correct answer, set to first option
                                  newCorrectAnswer = 0;
                                } else if (newCorrectAnswer > idx) {
                                  // If correct answer is after removed option, decrement
                                  newCorrectAnswer = newCorrectAnswer - 1;
                                }
                                setQuestionForm({ 
                                  ...questionForm, 
                                  options: newOptions,
                                  correctAnswer: newCorrectAnswer
                                });
                              }}
                              className="px-2 md:px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-xs md:text-sm flex-shrink-0"
                              title="Remove this option"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {/* Progress indicator for this option */}
                        {(generatingQuizAudio || generatingAllAudio) && (
                          <div className="ml-6 mt-1 text-xs">
                            {isGenerating && (
                              <span className="text-yellow-400 animate-pulse">
                                🔄 Generating audio for Option {idx + 1}...
                              </span>
                            )}
                            {isCompleted && !isGenerating && (
                              <span className="text-green-400">
                                ✅ Option {idx + 1} audio generated
                              </span>
                            )}
                            {!isGenerating && !isCompleted && quizGenerationProgress.completed.question && (
                              <span className="text-gray-400">
                                ⏳ Waiting to generate Option {idx + 1}...
                              </span>
                            )}
                          </div>
                        )}
                        {/* Show audio status if available */}
                        {hasAudio && !generatingQuizAudio && !generatingAllAudio && (
                          <div className="ml-6 mt-1 text-xs text-green-400">
                            ✅ Option {idx + 1}: Audio & Timestamps ready
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(questionForm.options || []).length < 2 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ At least 2 options are required
                    </p>
                  )}
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateAllAudio}
                      disabled={generatingAllAudio || !questionForm.question || (questionForm.options || []).length < 2 || !questionForm.explanation?.correct?.trim() || !questionForm.explanation?.incorrect || questionForm.explanation.incorrect.length === 0}
                      className="flex-1 px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingAllAudio ? "🔄 Generating All Audio..." : "🎙️ Generate All Audio"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateQuizAudio}
                      disabled={generatingQuizAudio || generatingAllAudio || !questionForm.question || (questionForm.options || []).length < 2}
                      className="flex-1 px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingQuizAudio ? (
                        quizGenerationProgress.generatingQuestion 
                          ? "🔄 Generating Question..." 
                          : `🔄 Generating Options (${quizGenerationProgress.completed.options.filter(Boolean).length}/${(questionForm.options || []).length})...`
                      ) : "🎙️ Question & Options"}
                    </button>
                  </div>
                  {/* Progress indicator for question */}
                  {generatingQuizAudio && (
                    <div className="mt-2 text-xs">
                      {quizGenerationProgress.generatingQuestion && (
                        <p className="text-yellow-400 animate-pulse">
                          🔄 Generating question audio...
                        </p>
                      )}
                      {quizGenerationProgress.completed.question && !quizGenerationProgress.generatingQuestion && (
                        <p className="text-green-400">
                          ✅ Question audio generated
                        </p>
                      )}
                    </div>
                  )}
                  {questionForm.questionAudioUrl && questionForm.questionTimestampsUrl && !generatingQuizAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Question: Audio & Timestamps ready
                    </p>
                  )}
                  {questionForm.audioUrl && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Legacy combined audio: {questionForm.audioUrl} (use separate question/option audio instead)
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-300">
                      Correct Answer Explanation
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateCorrectExplanationAudio}
                      disabled={generatingCorrectExplanationAudio || !questionForm.explanation?.correct?.trim()}
                      className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {generatingCorrectExplanationAudio ? "🔄 Generating..." : "🎙️ Generate Audio"}
                    </button>
                  </div>
                  <RichTextEditor
                    value={questionForm.explanation?.correct || ""}
                    onChange={(value) =>
                      setQuestionForm({
                        ...questionForm,
                        explanation: {
                          ...questionForm.explanation,
                          correct: value,
                          incorrect: questionForm.explanation?.incorrect || [],
                        },
                      })
                    }
                    rows={2}
                    placeholder="Explanation for correct answer..."
                  />
                  {/* Progress indicator for correct explanation */}
                  {generatingCorrectExplanationAudio && (
                    <div className="mt-2 text-xs">
                      <p className="text-yellow-400 animate-pulse">
                        🔄 Generating correct explanation audio...
                      </p>
                    </div>
                  )}
                  {quizGenerationProgress.completed.correctExplanation && !generatingCorrectExplanationAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Correct explanation audio generated
                    </p>
                  )}
                  {questionForm.correctExplanationAudioUrl && !generatingCorrectExplanationAudio && !quizGenerationProgress.generatingCorrectExplanation && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Correct Audio: {questionForm.correctExplanationAudioUrl}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                    Incorrect Answer Explanations (one for each wrong option)
                  </label>
                  <div className="space-y-3">
                    {(questionForm.options || []).map((option, optionIdx) => {
                      // Skip the correct answer - it has its own explanation section
                      if (optionIdx === questionForm.correctAnswer) {
                        return null;
                      }
                      
                      // Get explanation for this option index (mapped by option index, not sequential)
                      const incorrectExplanations = questionForm.explanation?.incorrect || [];
                      // Ensure array is long enough and get explanation for this option index
                      while (incorrectExplanations.length <= optionIdx) {
                        incorrectExplanations.push("");
                      }
                      const incorrectText = incorrectExplanations[optionIdx] || "";
                      
                      const isGenerating = quizGenerationProgress.generatingIncorrectExplanations.includes(optionIdx);
                      const isCompleted = quizGenerationProgress.completed.incorrectExplanations[optionIdx];
                      const incorrectAudioUrls = (questionForm.incorrectExplanationAudioUrls || []) as string[];
                      const incorrectTimestampsUrls = (questionForm.incorrectExplanationTimestampsUrls || []) as string[];
                      // Ensure arrays are long enough
                      while (incorrectAudioUrls.length <= optionIdx) {
                        incorrectAudioUrls.push("");
                      }
                      while (incorrectTimestampsUrls.length <= optionIdx) {
                        incorrectTimestampsUrls.push("");
                      }
                      const hasAudio = incorrectAudioUrls[optionIdx] && incorrectTimestampsUrls[optionIdx];
                      
                      return (
                        <div key={optionIdx} className="border border-red-500/30 rounded-lg p-2 md:p-3 bg-red-500/5">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                            <span className="text-xs md:text-sm font-medium text-red-400">
                              Explanation for Option {optionIdx + 1} (Wrong Answer):
                            </span>
                            <span className="text-xs text-gray-400 italic">"{option}"</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 items-start">
                            <div className="flex-1 w-full">
                              <RichTextEditor
                                value={incorrectText}
                                onChange={(value) => {
                                  const newIncorrect = [...(questionForm.explanation?.incorrect || [])];
                                  // Ensure array is long enough
                                  while (newIncorrect.length <= optionIdx) {
                                    newIncorrect.push("");
                                  }
                                  newIncorrect[optionIdx] = value;
                                  setQuestionForm({
                                    ...questionForm,
                                    explanation: {
                                      ...questionForm.explanation,
                                      correct: questionForm.explanation?.correct || "",
                                      incorrect: newIncorrect,
                                    },
                                  });
                                }}
                                rows={2}
                                placeholder={`Why is option ${optionIdx + 1} incorrect?`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGenerateIncorrectExplanationAudio(optionIdx)}
                              disabled={generatingIncorrectExplanationAudio === optionIdx || generatingAllAudio || !incorrectText?.trim()}
                              className="px-2 md:px-3 py-2 text-xs md:text-sm bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              {generatingIncorrectExplanationAudio === optionIdx || isGenerating ? "🔄..." : "🎙️ Generate Audio"}
                            </button>
                          </div>
                          {/* Progress indicator for this incorrect explanation */}
                          {(generatingIncorrectExplanationAudio === optionIdx || generatingAllAudio || isGenerating) && (
                            <div className="ml-2 mt-1 text-xs">
                              {isGenerating && (
                                <span className="text-yellow-400 animate-pulse">
                                  🔄 Generating audio for option {optionIdx + 1} explanation...
                                </span>
                              )}
                              {isCompleted && !isGenerating && (
                                <span className="text-green-400">
                                  ✅ Option {optionIdx + 1} explanation audio generated
                                </span>
                              )}
                            </div>
                          )}
                          {/* Show audio status if available */}
                          {hasAudio && !isGenerating && generatingIncorrectExplanationAudio !== optionIdx && !generatingAllAudio && (
                            <div className="ml-2 mt-1 text-xs text-green-400">
                              ✅ Option {optionIdx + 1} Audio: {incorrectAudioUrls[optionIdx]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(questionForm.options || []).length === 0 && (
                    <p className="text-yellow-400 text-sm mt-2">
                      ⚠️ Add answer options above first, then explanations will appear here for each wrong option.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={questionForm.order || 0}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mt-4 md:mt-6">
                <button
                  onClick={() => handleSaveQuestion(editingQuestion || undefined)}
                  className="flex-1 px-4 py-2.5 text-sm md:text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2.5 text-sm md:text-base bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TTS Settings Modal */}
        {showTTSSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-purple-500/20 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
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

