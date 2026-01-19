import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Users, 
  MapPin, 
  Heart, 
  Briefcase, 
  CheckCircle, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  FileText,
  ShieldCheck,
  TrendingUp,
  Map,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  GraduationCap,
  Save,
  RotateCcw,
  Clock,
  Wallet,
  Plane,
  MessageCircle,
  Send,
  Printer,
  AlertCircle
} from 'lucide-react';

// --- Types & Interfaces ---

interface PastResidency {
  country: string;
  years: number;
}

interface QuizState {
  // Section 0: Personal Profile
  name: string;
  age: string;
  gender: string;
  dob: string;
  currentCitizenships: string;
  interestedCountries: string;
  
  // New: Student Status
  isStudent: boolean;
  schoolName: string;

  // Section 1: Ancestry
  parentBirthplace: string;
  parentCitizenship: string;
  grandparentForeign: boolean;
  grandparentService: boolean;
  greatGrandparentOrigin: string;
  renouncedCitizenship: boolean;
  historicalBorders: boolean;

  // Section 2: Geography
  birthCountry: string;
  parentsDiplomats: boolean;
  childInJusSoli: boolean;

  // Section 3: Residency
  currentPR: string;
  yearsResidency: number;
  pastResidencies: PastResidency[];
  formerColony: boolean;

  // Section 4: Civil Status
  spouseCitizenship: string;
  yearsMarried: number;
  religiousClaim: string;
  adoption: boolean;

  // Section 5: Financial
  investmentAssets: string;
  highSkills: boolean;
}

interface CountryResult {
  id: string;
  name: string;
  flag: string;
  probability: number;
  reason: string;
  type: string;
  steps: string[];
  govLink?: string;
  // New Fields
  cost: string;
  timeline: string;
  visaFree: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

// --- Initial State ---

const initialQuizState: QuizState = {
  name: '',
  age: '',
  gender: '',
  dob: '',
  currentCitizenships: '',
  interestedCountries: '',
  isStudent: false,
  schoolName: '',
  parentBirthplace: '',
  parentCitizenship: '',
  grandparentForeign: false,
  grandparentService: false,
  greatGrandparentOrigin: '',
  renouncedCitizenship: false,
  historicalBorders: false,
  birthCountry: '',
  parentsDiplomats: false,
  childInJusSoli: false,
  currentPR: '',
  yearsResidency: 0,
  pastResidencies: [{ country: '', years: 0 }],
  formerColony: false,
  spouseCitizenship: '',
  yearsMarried: 0,
  religiousClaim: '',
  adoption: false,
  investmentAssets: '0-50k',
  highSkills: false,
};

// --- AI Logic Engine ---

const apiKey = "AIzaSyBF3Rg6yb4Q8Q8jhaDT-HUkOcBnNdQfI_I"; // Runtime environment provides this

// Helper for Exponential Backoff
const fetchWithRetry = async (url: string, options: RequestInit, retries = 5, delay = 1000): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    
    // If successful, return immediately
    if (response.ok) return response;
    
    // If rate limited or server error, retry
    if (retries > 0 && (response.status === 429 || response.status >= 500)) {
       await new Promise(resolve => setTimeout(resolve, delay));
       return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    
    // If client error (400) or out of retries, log and throw
    const errorText = await response.text();
    console.error(`API Error (${response.status}):`, errorText);
    throw new Error(`AI Request Failed: ${response.status} ${response.statusText}`);

  } catch (error) {
    // Network errors (fetch throws)
    if (retries > 0) {
       await new Promise(resolve => setTimeout(resolve, delay));
       return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

const generateAIResults = async (data: QuizState): Promise<CountryResult[]> => {
  const isUnder18 = parseInt(data.age) < 18;

  const prompt = `
    Act as an expert immigration attorney and citizenship consultant. 
    Analyze the following user profile and suggest the top 5 best citizenship or residency options.
    
    CRITICAL INSTRUCTION: Address the user directly as "you" in the "reason" field.
    
    ${isUnder18 ? 'CRITICAL CONTEXT: User is UNDER 18. Suggest Future Pathways.' : ''}

    User Profile:
    Name: ${data.name}, Age: ${data.age}, Gender: ${data.gender}, DOB: ${data.dob}
    Student Status: ${data.isStudent ? 'Yes, currently studying at ' + data.schoolName : 'No'}.
    Current Citizenships: ${data.currentCitizenships}
    Interested In: ${data.interestedCountries}
    Ancestry: Parents born in ${data.parentBirthplace}, Great-grandparents from ${data.greatGrandparentOrigin}.
    Birth: Born in ${data.birthCountry}.
    Residency History: ${JSON.stringify(data.pastResidencies)}.
    Civil Status: Spouse is ${data.spouseCitizenship} (married ${data.yearsMarried} years). Religion/Ethnicity: ${data.religiousClaim}.
    Financial: Assets ${data.investmentAssets}, High Skills/PhD: ${data.highSkills}.

    Return a valid JSON array of objects with this EXACT structure (no markdown):
    [
      {
        "id": "unique_country_code",
        "name": "Country Name",
        "flag": "Flag Emoji",
        "probability": number (0-100),
        "type": "Type of claim (Ancestry, Investment, etc)",
        "reason": "Personalized explanation speaking to 'you'. If high assets, mention tax implications.",
        "cost": "Estimated cost (e.g. '$300 application fee' or '$250k investment')",
        "timeline": "Estimated time to citizenship (e.g. '2-3 years')",
        "visaFree": "Visa power highlights (e.g. 'Access to EU & USA')",
        "steps": ["Step 1 detailed", "Step 2 detailed", "Step 3 detailed", "Step 4 detailed", "Step 5 detailed"],
        "govLink": "URL to official portal"
      }
    ]
  `;

  try {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return JSON.parse(text);
    throw new Error('No data returned');

  } catch (error) {
    console.error("AI Generation failed, falling back to static logic", error);
    return calculateFallbackSuggestions(data);
  }
};

const sendChatQuery = async (query: string, country: CountryResult, user: QuizState): Promise<string> => {
    const prompt = `
      You are an immigration expert assisting ${user.name} with questions about ${country.name}.
      
      User Profile Context: Age ${user.age}, Citizen of ${user.currentCitizenships}, Assets ${user.investmentAssets}.
      Country Context: ${country.reason}. Cost: ${country.cost}. Time: ${country.timeline}.
      
      User Question: "${query}"
      
      Provide a concise, helpful answer (max 3 sentences) addressing the user directly.
    `;

    try {
        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't find an answer to that at the moment.";
    } catch (e) {
        return "Sorry, I'm having trouble connecting to the expert database right now.";
    }
}

// --- Fallback Logic (Static) ---

const calculateFallbackSuggestions = (data: QuizState): CountryResult[] => {
  const suggestions: CountryResult[] = [];
  const ancestryInput = data.greatGrandparentOrigin.toLowerCase();
  
  if (ancestryInput.includes('italy') || ancestryInput.includes('italian')) {
    suggestions.push({
      id: 'it', name: 'Italy', flag: '🇮🇹', probability: 85, type: 'Ancestry',
      reason: 'Based on your indicated Italian ancestry, you likely qualify for Jure Sanguinis.',
      cost: 'Approx €300 + Legal Fees', timeline: '1-3 Years', visaFree: 'EU Access, USA ESTA',
      steps: ['Gather birth/marriage/death certificates.', 'Get Certificates of Non-Naturalization.', 'Translate and Apostille documents.', 'Book Consulate appointment.'],
      govLink: 'https://www.esteri.it/en/servizi-consolari-e-visti/cittadinanza-italiana/'
    });
  }
  
  // Default fallback
  if (suggestions.length === 0) {
      suggestions.push({
          id: 'pt', name: 'Portugal', flag: '🇵🇹', probability: 60, type: 'Naturalization',
          reason: 'A popular choice for residency leading to citizenship after 5 years.',
          cost: 'Visa fees + Living costs', timeline: '5 Years', visaFree: 'Schengen Area Access',
          steps: ['Apply for D7 or Digital Nomad Visa.', 'Reside for 5 years.', 'Pass A2 language test.', 'Apply for citizenship.'],
          govLink: 'https://aima.gov.pt/'
      });
  }
  return suggestions;
};

// --- Components ---

const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div className="w-full bg-gray-200 h-2 rounded-full mb-8">
    <div 
      className="bg-[#228B22] h-2 rounded-full transition-all duration-500 ease-out" 
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
);

const SectionHeader = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="mb-8 text-center">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-[#228B22]" />
    </div>
    <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
    <p className="text-gray-500 max-w-lg mx-auto">{desc}</p>
  </div>
);

const InputGroup = ({ label, children, subLabel, required = false }: { label: string, children: React.ReactNode, subLabel?: string, required?: boolean }) => (
  <div className="mb-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-2 mb-1">
      <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">{label}</label>
      {required && <span className="text-red-500 text-xs font-bold">*REQUIRED</span>}
    </div>
    {subLabel && <p className="text-xs text-gray-400 mb-3">{subLabel}</p>}
    <div className={subLabel ? '' : 'mt-2'}>{children}</div>
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = "text" }: { value: string, onChange: (val: string) => void, placeholder: string, type?: string }) => (
  <input
    type={type}
    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#228B22] focus:border-transparent outline-none transition-all"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

const SelectInput = ({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: string[] }) => (
  <select
    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#228B22] focus:border-transparent outline-none bg-white"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="" disabled>Select an option</option>
    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
  </select>
);

const ToggleInput = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600 font-medium">{label}</span>
    <button 
      onClick={() => onChange(!checked)}
      className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 ${checked ? 'bg-[#228B22]' : 'bg-gray-300'}`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

// --- Main Application ---

export default function CitizenSuggestApp() {
  const [view, setView] = useState<'welcome' | 'quiz' | 'review' | 'analyzing' | 'suggestions' | 'details'>('welcome');
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuizState>(initialQuizState);
  const [results, setResults] = useState<CountryResult[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [detailsViewId, setDetailsViewId] = useState<string | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);
  
  // Loading State
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const loadingMessages = [
      "Analyzing your ancestry profile...", 
      "Checking historical border changes...", 
      "Evaluating investment thresholds...", 
      "Reviewing visa-free treaty access...",
      "Compiling government data..."
  ];

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const totalSteps = 6;

  useEffect(() => {
    const saved = localStorage.getItem('citizenSuggestData');
    if (saved) setHasSavedData(true);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === 'analyzing') {
        interval = setInterval(() => {
            setLoadingMsgIndex(prev => (prev + 1) % loadingMessages.length);
        }, 1500);
    }
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const saveProgress = () => {
    localStorage.setItem('citizenSuggestData', JSON.stringify(answers));
    alert("Profile saved! You can resume from the main screen anytime.");
  };

  const loadProgress = () => {
    const saved = localStorage.getItem('citizenSuggestData');
    if (saved) {
      setAnswers(JSON.parse(saved));
      setView('review');
    }
  };

  const updateAnswer = (key: keyof QuizState, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  // --- Validation Logic ---
  const isStepValid = () => {
      switch(step) {
          case 1: // Profile
            return answers.name.length > 1 && answers.age.length > 0 && answers.dob.length > 0 && answers.gender.length > 0;
          case 3: // Geography
            return answers.birthCountry.length > 1;
          default:
            return true;
      }
  };

  // Past Residency Helpers
  const addResidency = () => {
    setAnswers(prev => ({
      ...prev,
      pastResidencies: [...prev.pastResidencies, { country: '', years: 0 }]
    }));
  };

  const removeResidency = (index: number) => {
    setAnswers(prev => ({
      ...prev,
      pastResidencies: prev.pastResidencies.filter((_, i) => i !== index)
    }));
  };

  const updateResidency = (index: number, field: keyof PastResidency, value: string | number) => {
    setAnswers(prev => {
      const newResidencies = [...prev.pastResidencies];
      newResidencies[index] = { ...newResidencies[index], [field]: value };
      return { ...prev, pastResidencies: newResidencies };
    });
  };

  const handleQuizComplete = () => {
    setView('review');
  };

  const processResults = async () => {
    setView('analyzing');
    const data = await generateAIResults(answers);
    setResults(data);
    setView('suggestions');
  };

  const toggleCountrySelection = (id: string) => {
    if (selectedCountries.includes(id)) {
      setSelectedCountries(prev => prev.filter(c => c !== id));
    } else {
      setSelectedCountries(prev => [...prev, id]);
    }
  };

  const handleChatSubmit = async () => {
      if (!chatInput.trim() || !detailsViewId) return;
      const country = results.find(r => r.id === detailsViewId);
      if (!country) return;

      const userMsg = chatInput;
      setChatInput("");
      setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
      setIsChatLoading(true);

      const aiResponse = await sendChatQuery(userMsg, country, answers);
      
      setChatHistory(prev => [...prev, { sender: 'ai', text: aiResponse }]);
      setIsChatLoading(false);
  };

  // --- Views ---

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8 p-6 bg-white rounded-full shadow-lg">
           <Map className="w-16 h-16 text-[#228B22]" />
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">CitizenSuggest</h1>
        <span className="text-[#228B22] font-serif italic text-sm mb-6">by Mamut</span>
        
        <p className="text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed font-light">
          Discover your hidden citizenship opportunities. Where you are born doesn't define where you belong, 
          use CitizenSuggest and find out where you could belong.
        </p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => setView('quiz')}
            className="group bg-[#228B22] text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl hover:bg-green-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            Start Assessment <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          {hasSavedData && (
            <button 
              onClick={loadProgress}
              className="text-gray-600 bg-white border border-gray-200 px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Resume Saved Session
            </button>
          )}
        </div>
        <p className="mt-8 text-sm text-gray-400">Powered by AI • Takes 2 minutes</p>
      </div>
    );
  }

  if (view === 'quiz') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 md:px-0">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
             <div className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Map className="w-5 h-5 text-[#228B22]" /> CitizenSuggest
             </div>
             <div className="text-[#228B22] font-medium">Step {step} of {totalSteps}</div>
          </div>
          
          <ProgressBar current={step} total={totalSteps} />

          {/* Steps */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 min-h-[500px] flex flex-col justify-between">
            <div>
              {step === 1 && (
                <>
                  <SectionHeader 
                    icon={Users} 
                    title="Your Profile" 
                    desc="Tell us a bit about yourself so we can tailor the suggestions."
                  />
                  <div className="grid md:grid-cols-2 gap-6">
                    <InputGroup label="Full Name" required>
                      <TextInput 
                        placeholder="Your Name" 
                        value={answers.name}
                        onChange={(v) => updateAnswer('name', v)}
                      />
                    </InputGroup>
                    <InputGroup label="Gender" required>
                      <SelectInput 
                        value={answers.gender}
                        onChange={(v) => updateAnswer('gender', v)}
                        options={['Male', 'Female', 'Non-binary', 'Prefer not to say']}
                      />
                    </InputGroup>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                     <InputGroup label="Age" required>
                       <TextInput 
                          placeholder="e.g. 28" 
                          type="number"
                          value={answers.age}
                          onChange={(v) => updateAnswer('age', v)}
                        />
                     </InputGroup>
                     <InputGroup label="Date of Birth" required>
                       <TextInput 
                          placeholder="DD/MM/YYYY" 
                          type="date"
                          value={answers.dob}
                          onChange={(v) => updateAnswer('dob', v)}
                        />
                     </InputGroup>
                  </div>

                  {/* Student Question */}
                  <div className="p-4 bg-green-50 rounded-xl mb-6 border border-green-100">
                    <div className="flex items-center gap-3 mb-4">
                      <GraduationCap className="w-5 h-5 text-[#228B22]" />
                      <span className="font-bold text-gray-800">Are you currently studying?</span>
                      <div className="flex gap-4 ml-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="isStudent" 
                            checked={answers.isStudent} 
                            onChange={() => updateAnswer('isStudent', true)}
                            className="text-[#228B22] focus:ring-[#228B22]"
                          />
                          Yes
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="isStudent" 
                            checked={!answers.isStudent} 
                            onChange={() => updateAnswer('isStudent', false)}
                            className="text-[#228B22] focus:ring-[#228B22]"
                          />
                          No
                        </label>
                      </div>
                    </div>
                    
                    {answers.isStudent && (
                      <TextInput 
                        placeholder="School or University Name"
                        value={answers.schoolName}
                        onChange={(v) => updateAnswer('schoolName', v)}
                      />
                    )}
                  </div>

                  <InputGroup label="Current Citizenships" subLabel="Separate multiple with commas">
                     <TextInput 
                        placeholder="e.g. USA, France" 
                        value={answers.currentCitizenships}
                        onChange={(v) => updateAnswer('currentCitizenships', v)}
                      />
                  </InputGroup>

                  <InputGroup label="Interested in Living In" subLabel="Where do you dream of moving?">
                     <TextInput 
                        placeholder="e.g. European Union, Japan, Canada" 
                        value={answers.interestedCountries}
                        onChange={(v) => updateAnswer('interestedCountries', v)}
                      />
                  </InputGroup>
                </>
              )}

              {step === 2 && (
                <>
                  <SectionHeader 
                    icon={Users} 
                    title="Ancestry & Descent" 
                    desc="Citizenship by descent (Jus Sanguinis) is often the most powerful way to claim a second passport."
                  />
                  <div className="grid md:grid-cols-2 gap-6">
                    <InputGroup label="Parents' Birthplace">
                      <TextInput 
                        placeholder="e.g. United Kingdom, USA" 
                        value={answers.parentBirthplace}
                        onChange={(v) => updateAnswer('parentBirthplace', v)}
                      />
                    </InputGroup>
                    <InputGroup label="Parents' Citizenship at your birth">
                      <TextInput 
                        placeholder="e.g. British, French" 
                        value={answers.parentCitizenship}
                        onChange={(v) => updateAnswer('parentCitizenship', v)}
                      />
                    </InputGroup>
                  </div>
                  
                  <InputGroup label="Grandparents & Great-Grandparents">
                     <div className="space-y-4">
                        <ToggleInput 
                          label="Were any grandparents born in a foreign country?" 
                          checked={answers.grandparentForeign}
                          onChange={(v) => updateAnswer('grandparentForeign', v)}
                        />
                        <ToggleInput 
                          label="Did they serve in foreign military/govt?" 
                          checked={answers.grandparentService}
                          onChange={(v) => updateAnswer('grandparentService', v)}
                        />
                     </div>
                  </InputGroup>

                  <InputGroup label="Specific Ancestry" subLabel="Do you have ancestors (up to great-grandparents) from Italy, Poland, Hungary, Ireland?">
                      <TextInput 
                        placeholder="e.g. My great-grandfather was Italian" 
                        value={answers.greatGrandparentOrigin}
                        onChange={(v) => updateAnswer('greatGrandparentOrigin', v)}
                      />
                  </InputGroup>

                  <InputGroup label="The 'Unbroken' Link">
                    <ToggleInput 
                      label="Did ancestors renounce citizenship before next generation was born?" 
                      checked={answers.renouncedCitizenship}
                      onChange={(v) => updateAnswer('renouncedCitizenship', v)}
                    />
                  </InputGroup>
                </>
              )}

              {step === 3 && (
                <>
                   <SectionHeader 
                    icon={MapPin} 
                    title="Geography & Birthplace" 
                    desc="Jus Soli: Did the soil on which you were born grant you rights?"
                  />
                  <InputGroup label="Your Birth Country" required>
                     <TextInput 
                        placeholder="e.g. Brazil, Canada, USA" 
                        value={answers.birthCountry}
                        onChange={(v) => updateAnswer('birthCountry', v)}
                      />
                  </InputGroup>
                  <InputGroup label="Exceptions">
                    <ToggleInput 
                      label="Were parents foreign diplomats/enemy aliens at birth?" 
                      checked={answers.parentsDiplomats}
                      onChange={(v) => updateAnswer('parentsDiplomats', v)}
                    />
                  </InputGroup>
                  <InputGroup label="Future Planning">
                    <ToggleInput 
                      label="Are you planning children in a Jus Soli country?" 
                      checked={answers.childInJusSoli}
                      onChange={(v) => updateAnswer('childInJusSoli', v)}
                    />
                  </InputGroup>
                </>
              )}

              {step === 4 && (
                <>
                  <SectionHeader 
                    icon={Globe} 
                    title="Residency & Time" 
                    desc="Have you lived abroad? Past residency can sometimes count towards naturalization."
                  />
                  <InputGroup label="Current Status">
                    <TextInput 
                        placeholder="Do you hold PR/Green Card somewhere?" 
                        value={answers.currentPR}
                        onChange={(v) => updateAnswer('currentPR', v)}
                      />
                      <div className="mt-4">
                        <label className="text-sm text-gray-600">Years held:</label>
                        <input 
                          type="number" 
                          className="w-full mt-2 p-3 border rounded-lg"
                          value={answers.yearsResidency}
                          onChange={(e) => updateAnswer('yearsResidency', parseInt(e.target.value) || 0)}
                        />
                      </div>
                  </InputGroup>

                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                       <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Past Residencies (2+ Years)</label>
                       <button onClick={addResidency} className="text-[#228B22] text-sm font-bold flex items-center gap-1 hover:underline">
                          <Plus className="w-4 h-4" /> Add Country
                       </button>
                    </div>
                    
                    {answers.pastResidencies.map((residency, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <div className="flex-1">
                          <TextInput 
                            placeholder="Country" 
                            value={residency.country}
                            onChange={(v) => updateResidency(idx, 'country', v)}
                          />
                        </div>
                        <div className="w-24">
                           <input 
                              type="number" 
                              placeholder="Yrs"
                              className="w-full p-3 border border-gray-300 rounded-lg"
                              value={residency.years || ''}
                              onChange={(e) => updateResidency(idx, 'years', parseInt(e.target.value) || 0)}
                           />
                        </div>
                        {answers.pastResidencies.length > 1 && (
                          <button onClick={() => removeResidency(idx)} className="p-3 text-red-400 hover:text-red-600">
                             <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <InputGroup label="History">
                    <ToggleInput 
                      label="Are you a citizen of a former colony (e.g. Ibero-American)?" 
                      checked={answers.formerColony}
                      onChange={(v) => updateAnswer('formerColony', v)}
                    />
                  </InputGroup>
                </>
              )}

              {step === 5 && (
                <>
                   <SectionHeader 
                    icon={Heart} 
                    title="Civil Status" 
                    desc="Marriage and religion can open fast-track doors to citizenship."
                  />
                  <InputGroup label="Marriage">
                     <TextInput 
                        placeholder="Spouse's Citizenship (if different)" 
                        value={answers.spouseCitizenship}
                        onChange={(v) => updateAnswer('spouseCitizenship', v)}
                      />
                      {answers.spouseCitizenship && (
                         <div className="mt-4">
                            <label className="text-sm text-gray-600">Years Married:</label>
                            <input 
                              type="number" 
                              className="w-full mt-2 p-3 border rounded-lg"
                              value={answers.yearsMarried}
                              onChange={(e) => updateAnswer('yearsMarried', parseInt(e.target.value) || 0)}
                            />
                         </div>
                      )}
                  </InputGroup>
                  <InputGroup label="Religion & Ethnicity">
                    <SelectInput 
                      value={answers.religiousClaim}
                      onChange={(v) => updateAnswer('religiousClaim', v)}
                      options={['None', 'Jewish (Sephardic)', 'Ethnic German', 'Ethnic Greek', 'Other']}
                    />
                  </InputGroup>
                  <InputGroup label="Adoption">
                     <ToggleInput 
                      label="Were you adopted by citizens of another country?" 
                      checked={answers.adoption}
                      onChange={(v) => updateAnswer('adoption', v)}
                    />
                  </InputGroup>
                </>
              )}

              {step === 6 && (
                 <>
                   <SectionHeader 
                    icon={Briefcase} 
                    title="Financial & Professional" 
                    desc="Your assets or skills can be the key to Golden Visas and expedited entry."
                  />
                  <InputGroup label="Investment Capacity (Liquid Assets)">
                    <SelectInput 
                      value={answers.investmentAssets}
                      onChange={(v) => updateAnswer('investmentAssets', v)}
                      options={['0-50k', '50k-100k', '100k-500k', '500k-1m', '1m+']}
                    />
                    <p className="text-xs text-gray-400 mt-2">Used for Citizenship by Investment programs.</p>
                  </InputGroup>
                  <InputGroup label="Skills">
                     <ToggleInput 
                      label="Do you hold a PhD or work in high-tech research?" 
                      checked={answers.highSkills}
                      onChange={(v) => updateAnswer('highSkills', v)}
                    />
                  </InputGroup>
                 </>
              )}
            </div>

            {/* Nav Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
               <button 
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${step === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
               >
                 <ChevronLeft className="w-5 h-5" /> Previous
               </button>

               {step < totalSteps ? (
                 <button 
                  onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
                  disabled={!isStepValid()}
                  className={`bg-[#228B22] text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 ${!isStepValid() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                 >
                   Next <ChevronRight className="w-5 h-5" />
                 </button>
               ) : (
                 <button 
                  onClick={handleQuizComplete}
                  className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2"
                 >
                   Finish & Review <CheckCircle className="w-5 h-5" />
                 </button>
               )}
            </div>
            {!isStepValid() && (
                <div className="text-center mt-2 text-red-500 text-sm font-medium flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Please fill in all required fields
                </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'review') {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-gray-900">Profile Review</h2>
            <button 
               onClick={saveProgress}
               className="text-gray-500 hover:text-[#228B22] flex items-center gap-1 text-sm font-semibold"
            >
               <Save className="w-4 h-4" /> Save Answers
            </button>
          </div>
          <p className="text-gray-500 mb-8">Confirm your details. AI will use this to find your best matches.</p>
          
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
               <div>
                 <span className="block text-xs uppercase text-gray-400 font-bold">Personal</span>
                 <div className="font-medium text-gray-800">{answers.name}, {answers.age} years old</div>
                 {answers.isStudent && <div className="text-sm text-[#228B22]">Student at {answers.schoolName}</div>}
                 <div className="text-sm text-gray-500">Citizen of: {answers.currentCitizenships || 'Not listed'}</div>
               </div>
               <button onClick={() => {setView('quiz'); setStep(1)}} className="text-[#228B22] text-sm font-semibold">Edit</button>
            </div>

            <div className="flex justify-between items-start border-b pb-4">
               <div>
                 <span className="block text-xs uppercase text-gray-400 font-bold">Ancestry</span>
                 <div className="font-medium text-gray-800">
                   {answers.greatGrandparentOrigin ? `Ancestors from: ${answers.greatGrandparentOrigin}` : 'No specific ancestry listed'}
                 </div>
               </div>
               <button onClick={() => {setView('quiz'); setStep(2)}} className="text-[#228B22] text-sm font-semibold">Edit</button>
            </div>

            <div className="flex justify-between items-start border-b pb-4">
               <div>
                 <span className="block text-xs uppercase text-gray-400 font-bold">Residency</span>
                 <div className="font-medium text-gray-800">
                    {answers.pastResidencies.length > 0 && answers.pastResidencies[0].country 
                        ? `${answers.pastResidencies.length} countries listed` 
                        : 'No past residency'}
                 </div>
               </div>
               <button onClick={() => {setView('quiz'); setStep(4)}} className="text-[#228B22] text-sm font-semibold">Edit</button>
            </div>
            
            <div className="flex justify-between items-start">
               <div>
                 <span className="block text-xs uppercase text-gray-400 font-bold">Financial</span>
                 <div className="font-medium text-gray-800">{answers.investmentAssets}</div>
               </div>
               <button onClick={() => {setView('quiz'); setStep(6)}} className="text-[#228B22] text-sm font-semibold">Edit</button>
            </div>
          </div>

          <button 
            onClick={processResults}
            className="w-full mt-8 bg-[#228B22] text-white py-4 rounded-xl text-xl font-bold shadow-xl hover:bg-green-700 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
          >
            <TrendingUp className="w-6 h-6" /> Analyze with AI
          </button>
        </div>
      </div>
    );
  }

  if (view === 'analyzing') {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-16 h-16 text-[#228B22] animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing your profile...</h2>
            <p className="text-gray-500 h-6 transition-all duration-300">
                {loadingMessages[loadingMsgIndex]}
            </p>
        </div>
    );
  }

  if (view === 'suggestions') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Matches for {answers.name}</h2>
            <p className="text-gray-500 mt-2">Based on our AI analysis, these are your top opportunities. Select the ones you want to pursue.</p>
          </div>

          <div className="grid gap-6">
            {results.map((country, idx) => (
              <div 
                key={country.id}
                className={`bg-white rounded-2xl p-6 shadow-md transition-all border-2 cursor-pointer relative overflow-hidden group ${selectedCountries.includes(country.id) ? 'border-[#228B22] ring-4 ring-green-50' : 'border-transparent hover:border-gray-200'}`}
                onClick={() => toggleCountrySelection(country.id)}
              >
                {/* Selection Indicator */}
                <div className={`absolute top-6 right-6 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCountries.includes(country.id) ? 'bg-[#228B22] border-[#228B22]' : 'border-gray-300'}`}>
                   {selectedCountries.includes(country.id) && <CheckCircle className="w-5 h-5 text-white" />}
                </div>

                <div className="flex items-start gap-6">
                  <div className="text-6xl select-none">{country.flag}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold text-gray-900">{country.name}</h3>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wider">{country.type}</span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 pr-12">{country.reason}</p>
                    
                    {/* Badges Preview */}
                    <div className="flex gap-3 mb-4 text-xs font-semibold text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Wallet className="w-3 h-3" /> {country.cost}</span>
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Clock className="w-3 h-3" /> {country.timeline}</span>
                    </div>

                    {/* Probability Score */}
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-sm font-bold mb-1">
                        <span className="text-[#228B22]">Probability Score</span>
                        <span>{country.probability}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${country.probability > 80 ? 'bg-[#228B22]' : country.probability > 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                          style={{ width: `${country.probability}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center flex flex-col items-center gap-4">
            <button 
              disabled={selectedCountries.length === 0}
              onClick={() => {
                  setDetailsViewId(selectedCountries[0]);
                  setView('details');
              }}
              className="bg-gray-900 disabled:bg-gray-400 text-white px-10 py-4 rounded-xl text-lg font-bold shadow-lg hover:scale-105 transition-all"
            >
              Continue to Step-by-Step Guide ({selectedCountries.length})
            </button>
            <div className="flex gap-4">
              <button onClick={() => setView('quiz')} className="text-gray-400 hover:text-gray-600">
                  Go back to edit profile
              </button>
              <button onClick={saveProgress} className="text-[#228B22] font-semibold flex items-center gap-1 hover:underline">
                  <Save className="w-4 h-4" /> Save current results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'details') {
    const activeCountry = results.find(r => r.id === detailsViewId);
    
    // Determine next country in selection list for navigation
    const currentIndex = selectedCountries.indexOf(detailsViewId || '');
    const nextCountryId = selectedCountries[currentIndex + 1];
    const prevCountryId = selectedCountries[currentIndex - 1];

    return (
      <div className="min-h-screen bg-white flex flex-col md:flex-row">
        
        {/* Mobile Horizontal Nav */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-20 flex overflow-x-auto gap-2">
            {selectedCountries.map(id => {
                const c = results.find(r => r.id === id);
                return (
                    <button
                        key={id}
                        onClick={() => setDetailsViewId(id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap ${detailsViewId === id ? 'bg-[#228B22] text-white border-[#228B22]' : 'bg-white text-gray-600 border-gray-300'}`}
                    >
                        {c?.flag} {c?.name}
                    </button>
                )
            })}
        </div>

        {/* Sidebar Navigation (Desktop) */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-6 hidden md:block h-screen sticky top-0">
           <div className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
             <Map className="w-6 h-6 text-[#228B22]" /> CitizenSuggest
           </div>
           <nav className="space-y-2">
             {selectedCountries.map(id => {
                const c = results.find(r => r.id === id);
                return (
                  <button 
                    key={id}
                    onClick={() => setDetailsViewId(id)}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${detailsViewId === id ? 'bg-green-100 text-[#228B22] font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <span>{c?.flag}</span>
                    <span>{c?.name}</span>
                  </button>
                )
             })}
           </nav>
           <button onClick={() => setView('suggestions')} className="mt-8 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Back to Suggestions
           </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto">
          {activeCountry ? (
             <div className="max-w-3xl mx-auto pb-20">
                
                {/* Header Action Row */}
                <div className="flex justify-end mb-4">
                    <button 
                        onClick={() => window.print()} 
                        className="text-gray-500 hover:text-gray-900 flex items-center gap-2 text-sm font-medium"
                    >
                        <Printer className="w-4 h-4" /> Print / Save PDF
                    </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                   <span className="text-6xl shadow-sm rounded-lg p-2 bg-gray-50 w-20 text-center">{activeCountry.flag}</span>
                   <div>
                      <h1 className="text-4xl font-extrabold text-gray-900">{activeCountry.name}</h1>
                      <div className="flex items-center gap-2 mt-2 text-gray-500">
                        <ShieldCheck className="w-5 h-5 text-[#228B22]" />
                        <span>Application Process Guide</span>
                      </div>
                   </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Wallet className="w-3 h-3" /> Est. Cost</div>
                        <div className="font-bold text-gray-800">{activeCountry.cost}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Timeline</div>
                        <div className="font-bold text-gray-800">{activeCountry.timeline}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Plane className="w-3 h-3" /> Visa Power</div>
                        <div className="font-bold text-gray-800 text-sm">{activeCountry.visaFree}</div>
                    </div>
                </div>

                <div className="bg-green-50 border border-green-100 p-6 rounded-xl mb-10 flex gap-4">
                  <Info className="w-6 h-6 text-[#228B22] flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-green-900 mb-1">Why this fits you</h4>
                    <p className="text-green-800 leading-relaxed">{activeCountry.reason}</p>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <FileText className="w-6 h-6" /> Step-by-Step Instructions
                </h3>

                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                  {activeCountry.steps.map((stepText, idx) => (
                    <div key={idx} className="relative flex items-start group is-active"> 
                        <div className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#228B22] text-[#228B22] font-bold z-10 shadow-sm group-hover:bg-[#228B22] group-hover:text-white transition-colors">
                           {idx + 1}
                        </div>
                        <div className="pl-16">
                           <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                              <p className="text-gray-700 font-medium leading-relaxed">{stepText}</p>
                           </div>
                        </div>
                    </div>
                  ))}
                </div>

                {activeCountry.govLink && (
                    <div className="mt-10 p-6 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-blue-900">Official Resource</h4>
                            <p className="text-blue-700 text-sm">Apply via the official government portal.</p>
                        </div>
                        <a 
                            href={activeCountry.govLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                            Open Portal <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                )}

                {/* Follow-up Chat Section */}
                <div className="mt-16 pt-10 border-t border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-[#228B22]" /> Ask an Expert about {activeCountry.name}
                    </h3>
                    
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto mb-4 border border-gray-200">
                        {chatHistory.length === 0 ? (
                            <div className="text-center text-gray-400 mt-8 text-sm">
                                Ask about taxes, specific visa types, or family rules...
                            </div>
                        ) : (
                            chatHistory.map((msg, i) => (
                                <div key={i} className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-[#228B22] text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))
                        )}
                        {isChatLoading && (
                            <div className="flex justify-start mb-3">
                                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                            placeholder={`Question about ${activeCountry.name}...`}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#228B22] focus:border-transparent outline-none"
                        />
                        <button 
                            onClick={handleChatSubmit}
                            disabled={!chatInput.trim() || isChatLoading}
                            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-black disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="mt-16 flex justify-between">
                   <button 
                     disabled={!prevCountryId}
                     onClick={() => setDetailsViewId(prevCountryId)}
                     className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium disabled:opacity-30 hover:bg-gray-50"
                   >
                     Previous
                   </button>
                   <button 
                     disabled={!nextCountryId}
                     onClick={() => setDetailsViewId(nextCountryId)}
                     className="px-6 py-3 rounded-lg bg-[#228B22] text-white font-bold disabled:opacity-30 hover:bg-green-700"
                   >
                     Next
                   </button>
                </div>
             </div>
          ) : (
            <div className="text-center mt-20">
               <p>Please select a country from the sidebar.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}