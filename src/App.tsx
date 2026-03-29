import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { 
  Upload, 
  Camera as CameraIcon, 
  ShieldCheck, 
  Activity, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Droplets,
  Sun,
  Zap,
  RefreshCw,
  X,
  Stethoscope,
  Lightbulb,
  Info,
  Calendar,
  MapPin,
  Clock,
  Building2,
  Shield,
  FileText,
  Microscope,
  Dna,
  HeartPulse,
  ChevronDown,
  Plus,
  Camera,
  User,
  LogIn,
  LogOut
} from 'lucide-react';
import { cn } from './lib/utils';
import { analyzeAcne } from './services/gemini';
import { AnalysisResult, AcneType } from './types';
import datasetCsvRaw from './data/Facial Skin Condition Dataset.csv?raw';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import faceAcneImage from './images/faceAcne.png';
import faceAcneSample1 from './images/FACEACNEimg-1.jpeg';
import faceAcneSample2 from './images/FACEACNEimg-2.jpeg';
import faceAcneSample3 from './images/FACEACNEimg-3.jpeg';
import faceAcneSample4 from './images/FACEACNEimg-4.jpeg';
import faceAcneSample5 from './images/FACEACNEimg-5.jpeg';
import faceAcneSample6 from './images/FACEACNEimg-6.jpeg';
import verticalImage1 from './images/vertical-image-1.png';
import verticalImage2 from './images/vertical-image-2.jpg';

interface UserData {
  name: string;
  email: string;
  photoURL?: string;
}

const ACNE_COLORS: Record<AcneType, string> = {
  whitehead: 'bg-white border-gray-300',
  blackhead: 'bg-black border-gray-600',
  papule: 'bg-red-400 border-red-600',
  pustule: 'bg-yellow-200 border-yellow-600',
};

const FAQ_ITEMS = [
  {
    question: 'Why is acne face analysis useful before starting treatment?',
    answer:
      'It helps identify acne type, severity, and affected zones so your routine can be more targeted and consistent.',
  },
  {
    question: 'Does this platform support different skin tones and face types?',
    answer:
      'Yes. The flow is designed to analyze multiple acne patterns across varied skin tones when a clear face image is provided.',
  },
  {
    question: 'What image quality gives the best acne face metrics?',
    answer:
      'Use a front-facing image with natural lighting, no heavy filters, and the full face clearly visible.',
  },
  {
    question: 'Can I re-upload the same image and compare results?',
    answer:
      'Yes. Re-uploading the same image gives stable metrics, while different images produce different analysis outputs.',
  },
  {
    question: 'Is this a replacement for a dermatologist consultation?',
    answer:
      'No. This is a guidance tool for early acne assessment. Persistent or severe acne should be evaluated by a dermatologist.',
  },
  {
    question: 'How often should I upload images for progress tracking?',
    answer:
      'Use similar lighting and angle weekly to compare trends in acne score and visible lesion distribution.',
  },
  {
    question: 'Can makeup or filters affect acne face results?',
    answer:
      'Yes. Heavy makeup, beauty filters, or smoothing effects can reduce accuracy. Upload natural, unfiltered images.',
  },
  {
    question: 'Which face angle is best for acne analysis?',
    answer:
      'Front-facing images work best. Side images can be used, but full frontal clarity gives more stable metrics.',
  },
];

const TRAIL_SAMPLE_IMAGES = [
  {
    src: faceAcneSample1,
    title: 'Sample Face 01',
  },
  {
    src: faceAcneSample2,
    title: 'Sample Face 02',
  },
  {
    src: faceAcneSample3,
    title: 'Sample Face 03',
  },
  {
    src: faceAcneSample4,
    title: 'Sample Face 04',
  },
  {
    src: faceAcneSample5,
    title: 'Sample Face 05',
  },
  {
    src: faceAcneSample6,
    title: 'Sample Face 06',
  },
];

const MIN_FACE_AREA_RATIO = 0.06;
const FACE_CROP_PADDING = 0.28;
let blazefaceModelPromise: Promise<any> | null = null;

type DatasetRecord = {
  id: string;
  gender: string;
  front: string;
  right: string;
  left: string;
};

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.?\//, '').trim().toLowerCase();
}

function parseDatasetCsv(csv: string): DatasetRecord[] {
  const lines = csv
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const [id = '', gender = '', front = '', right = '', left = ''] = line.split(',');
    return {
      id: id.trim(),
      gender: gender.trim().toLowerCase(),
      front: normalizePath(front),
      right: normalizePath(right),
      left: normalizePath(left),
    };
  });
}

const DATASET_RECORDS = parseDatasetCsv(datasetCsvRaw);

function detectDatasetView(candidatePath: string): 'front' | 'right' | 'left' | null {
  const path = normalizePath(candidatePath);
  if (path.includes('/front.')) return 'front';
  if (path.includes('/right-side.') || path.includes('/right.')) return 'right';
  if (path.includes('/left-side.') || path.includes('/left.')) return 'left';
  return null;
}

function getDatasetSeedFromFile(file: File): string | null {
  const candidates = [
    (file as any).webkitRelativePath as string | undefined,
    (file as any).path as string | undefined,
    file.name,
  ]
    .filter(Boolean)
    .map((value) => normalizePath(String(value)));

  for (const candidate of candidates) {
    const entryByPath = DATASET_RECORDS.find(
      (entry) =>
        candidate.endsWith(entry.front) ||
        candidate.endsWith(entry.right) ||
        candidate.endsWith(entry.left)
    );
    if (entryByPath) {
      const view =
        candidate.endsWith(entryByPath.front)
          ? 'front'
          : candidate.endsWith(entryByPath.right)
            ? 'right'
            : 'left';
      return `${entryByPath.id}|${entryByPath.gender}|${view}`;
    }

    const idMatch = candidate.match(/(?:^|\/)(\d+)(?:\/|[-_])/);
    const view = detectDatasetView(candidate);
    if (idMatch && view) {
      const id = idMatch[1];
      const entry = DATASET_RECORDS.find((item) => item.id === id);
      if (entry) return `${entry.id}|${entry.gender}|${view}`;
    }
  }

  return null;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function detectFaceWithBlazeFace(base64: string): Promise<{ x: number; y: number; width: number; height: number; landmarkCount: number } | null> {
  const img = await loadImageElement(base64);
  const tf = await import('@tensorflow/tfjs-core');
  await import('@tensorflow/tfjs-backend-webgl');
  if (tf.getBackend() !== 'webgl') {
    await tf.setBackend('webgl');
    await tf.ready();
  }

  if (!blazefaceModelPromise) {
    blazefaceModelPromise = (async () => {
      const blazeface = await import('@tensorflow-models/blazeface');
      return blazeface.load();
    })();
  }

  const model = await blazefaceModelPromise;
  const predictions = await model.estimateFaces(img, false);
  if (!predictions || predictions.length === 0) return null;

  const bestPrediction = predictions
    .map((p: any) => {
      const topLeft = Array.isArray(p.topLeft) ? p.topLeft : [0, 0];
      const bottomRight = Array.isArray(p.bottomRight) ? p.bottomRight : [0, 0];
      const x = Number(topLeft[0]) || 0;
      const y = Number(topLeft[1]) || 0;
      const width = Math.max(0, (Number(bottomRight[0]) || 0) - x);
      const height = Math.max(0, (Number(bottomRight[1]) || 0) - y);
      const landmarkCount = Array.isArray(p.landmarks) ? p.landmarks.length : 0;
      return { x, y, width, height, landmarkCount };
    })
    .sort((a: any, b: any) => b.width * b.height - a.width * a.height)[0];

  if (!bestPrediction || bestPrediction.width <= 0 || bestPrediction.height <= 0) return null;
  return bestPrediction;
}

async function detectPrimaryFace(base64: string): Promise<{ x: number; y: number; width: number; height: number; landmarkCount: number } | null> {
  const FaceDetectorCtor = (window as any).FaceDetector;
  if (!FaceDetectorCtor) {
    return detectFaceWithBlazeFace(base64);
  }

  const img = await loadImageElement(base64);
  const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 3 });
  const faces = await detector.detect(img);
  if (!faces || faces.length === 0) return null;

  const bestFace = faces
    .map((f: any) => ({ box: f?.boundingBox, landmarks: Array.isArray(f?.landmarks) ? f.landmarks : [] }))
    .filter((f: any) => Boolean(f.box))
    .sort((a: any, b: any) => b.box.width * b.box.height - a.box.width * a.box.height)[0];

  if (!bestFace) return null;
  return {
    x: Number(bestFace.box.x) || 0,
    y: Number(bestFace.box.y) || 0,
    width: Number(bestFace.box.width) || 0,
    height: Number(bestFace.box.height) || 0,
    landmarkCount: bestFace.landmarks.length,
  };
}

async function cropToFace(base64: string, box: { x: number; y: number; width: number; height: number }): Promise<string> {
  const img = await loadImageElement(base64);
  const padX = box.width * FACE_CROP_PADDING;
  const padY = box.height * FACE_CROP_PADDING;

  const sx = Math.max(0, Math.floor(box.x - padX));
  const sy = Math.max(0, Math.floor(box.y - padY));
  const ex = Math.min(img.width, Math.ceil(box.x + box.width + padX));
  const ey = Math.min(img.height, Math.ceil(box.y + box.height + padY));
  const sw = Math.max(1, ex - sx);
  const sh = Math.max(1, ey - sy);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to prepare face crop.');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/jpeg', 0.95);
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'analysis' | 'tech' | 'guide' | 'privacy' | 'doctors'>('upload');
  const [activeTab, setActiveTab] = useState<'routine' | 'insights'>('routine');
  const [showCamera, setShowCamera] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const capabilitiesSectionRef = useRef<HTMLElement | null>(null);

  const scrollToUploadActions = () => {
    requestAnimationFrame(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const goToUploadImageSection = () => {
    setStep('upload');
    setShowCamera(false);
    scrollToUploadActions();
  };

  const goToLiveCameraSection = () => {
    setStep('upload');
    setShowCamera(true);
    scrollToUploadActions();
  };

  const goToCapabilitiesSection = () => {
    setStep('upload');
    setShowCamera(false);
    requestAnimationFrame(() => {
      setTimeout(() => {
        capabilitiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setShowCamera(false);
      handleAnalyze(imageSrc, null);
    }
  }, [webcamRef]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const datasetSeed = getDatasetSeedFromFile(file);
        handleAnalyze(base64, datasetSeed);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    multiple: false,
  } as any);

  const handleAnalyze = async (base64: string, datasetSeed: string | null) => {
    const minimumAnalysisMs = 10000;
    setImage(base64);
    setAnalyzing(true);
    setAnalysisProgress(0);
    setResult(null);
    setError(null);
    setStep('analysis');

    let normalizedFaceImage = base64;
    try {
      const img = await loadImageElement(base64);
      const faceBox = await detectPrimaryFace(base64);
      if (!faceBox) {
        throw new Error('No valid human face detected. Please upload a clear front-facing face image.');
      }

      const faceAreaRatio = (faceBox.width * faceBox.height) / (img.width * img.height);
      if (!Number.isFinite(faceAreaRatio) || faceAreaRatio < MIN_FACE_AREA_RATIO) {
        throw new Error('Face is too small in this image. Please upload a closer face photo.');
      }

      if (faceBox.landmarkCount < 3) {
        throw new Error('Face validation failed. Please upload a clearer face image (front-facing, well lit).');
      }

      normalizedFaceImage = await cropToFace(base64, faceBox);
      setImage(normalizedFaceImage);
    } catch (faceErr) {
      const faceErrorMsg = faceErr instanceof Error ? faceErr.message : 'Invalid image for face scan.';
      setError(faceErrorMsg);
      setAnalyzing(false);
      setAnalysisProgress(0);
      return;
    }

    const startedAt = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(96, (elapsed / minimumAnalysisMs) * 100);
      setAnalysisProgress(progress);
    }, 120);

    const minDelayPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, minimumAnalysisMs);
    });

    try {
      const [data] = await Promise.all([
        analyzeAcne(normalizedFaceImage, { datasetSeed }),
        minDelayPromise,
      ]);
      setAnalysisProgress(100);
      setResult(data);
    } catch (err) {
      await minDelayPromise;
      setAnalysisProgress(100);
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Analysis Error:", errorMsg);
      setError(errorMsg);
    } finally {
      clearInterval(progressTimer);
      setTimeout(() => {
        setAnalyzing(false);
      }, 220);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setAnalysisProgress(0);
    setError(null);
    setStep('upload');
    setActiveTab('routine');
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginSuccess(true);
      setTimeout(() => setShowLoginSuccess(false), 3000);
    } catch (err) {
      const errorCode = typeof err === 'object' && err && 'code' in err ? String((err as any).code) : '';
      if (errorCode === 'auth/configuration-not-found') {
        setAuthError(
          'Google auth is not configured in Firebase project. Enable Google sign-in in Firebase Authentication and add localhost to Authorized domains.'
        );
        return;
      }
      if (errorCode === 'auth/unauthorized-domain') {
        setAuthError(
          'This domain is not authorized. Add localhost/127.0.0.1 (or your deployed domain) in Firebase Authentication -> Settings -> Authorized domains.'
        );
        return;
      }
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setAuthError(message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    reset();
  };

  const displayAcneType = result?.acneType?.trim() || 'Pending Analysis';
  const displayPercentage = Math.min(100, Math.max(0, Math.round(Number(result?.percentage ?? 0))));
  const displayScore = Math.min(100, Math.max(0, Math.round(Number(result?.score ?? 0))));
  const displayProblem =
    result?.problem?.trim() || 'No primary issue detected yet. Re-run analysis with a clearer facial image.';
  const displayRequirements =
    result?.requirements?.length
      ? result.requirements
      : ['Gentle cleansing', 'Barrier-friendly hydration', 'Daily sunscreen'];
  const displayRecommendations =
    result?.recommendations?.length
      ? result.recommendations
      : [
          {
            category: 'cleanser' as const,
            productName: 'Gentle pH-Balanced Cleanser',
            description: 'Use a non-stripping cleanser to reduce oil and impurities without damaging skin barrier.',
            ingredients: ['Glycerin', 'Ceramides'],
            howToUse: 'Use morning and evening, then pat dry with a clean towel.',
          },
          {
            category: 'treatment' as const,
            productName: 'Targeted Acne Treatment',
            description: 'Apply a thin acne treatment layer on affected areas to calm active inflammation.',
            ingredients: ['Salicylic acid', 'Niacinamide'],
            howToUse: 'Apply once daily at night, then increase based on tolerance.',
          },
          {
            category: 'moisturizer' as const,
            productName: 'Non-Comedogenic Moisturizer',
            description: 'Rehydrates skin and helps reduce irritation from active ingredients.',
            ingredients: ['Hyaluronic acid', 'Ceramides'],
            howToUse: 'Apply after treatment morning and night.',
          },
          {
            category: 'sunscreen' as const,
            productName: 'Broad-Spectrum SPF 50',
            description: 'Protects acne-prone skin from UV-triggered inflammation and post-acne marks.',
            ingredients: ['Zinc oxide', 'Titanium dioxide'],
            howToUse: 'Apply every morning and reapply every 2-3 hours outdoors.',
          },
        ];
  const displayTriggers =
    result?.dermatologyInsights?.triggers?.length
      ? result.dermatologyInsights.triggers
      : [
          { title: 'Stress fluctuation', description: 'High stress can increase inflammatory breakouts.' },
          { title: 'Occlusive products', description: 'Heavy products may block pores and worsen comedones.' },
        ];
  const displayLifestyleTips =
    result?.dermatologyInsights?.lifestyleTips?.length
      ? result.dermatologyInsights.lifestyleTips
      : [
          'Sleep 7-8 hours daily to support skin recovery.',
          'Avoid touching or picking acne lesions.',
          'Wash pillow covers and face towels regularly.',
        ];
  const displayClinicalAdvice =
    result?.dermatologyInsights?.clinicalAdvice?.trim() ||
    'If breakouts are persistent or painful, consult a dermatologist for prescription options.';
  const analysisStage =
    analysisProgress < 28
      ? 'Detecting acne regions...'
      : analysisProgress < 55
        ? 'Classifying lesion types...'
        : analysisProgress < 82
          ? 'Calculating severity and coverage...'
          : 'Generating dermatology recommendations...';
  const normalizedError = (error || '').toLowerCase();
  const canShowDetailedResults = Boolean(result) && !analyzing;
  const errorTip =
    normalizedError.includes('quota exceeded') || normalizedError.includes('http 429')
      ? 'Tip: Gemini quota is exhausted for this key/project. Enable billing or use another key with active quota, then retry.'
      : normalizedError.includes('api key') || normalizedError.includes('gemini_api_key')
        ? 'Tip: add `GEMINI_API_KEY` in `.env.local`, then restart `npm run dev`.'
        : 'Tip: upload a clear, front-facing image with good lighting for best acne-mapping quality.';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl border border-gray-100">
          <p className="text-center text-sm font-bold text-gray-600">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl shadow-blue-100 border border-gray-100 space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">Face AcneScan</h1>
            <p className="text-gray-500 font-medium">Sign in with Google to continue securely</p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-4 bg-white text-gray-900 rounded-2xl font-black text-base border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.3 2.4-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.4-4.2 5.8l.1-.1 6.2 5.2C37 38.7 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              Continue with Google
            </button>
            {authError && (
              <p className="text-xs text-red-600 font-semibold text-center">{authError}</p>
            )}
          </div>

          <div className="pt-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Secure & Private Analysis</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Login Success Popup */}
      <AnimatePresence>
        {showLoginSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-6 h-6" />
            Welcome back, {user.name}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-b border-gray-100 z-50 flex items-center justify-between px-8">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setStep('upload')}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="font-black text-xl tracking-tighter text-gray-900">Face AcniScan</span>
        </div>
        
        <nav className="hidden lg:flex items-center gap-10 text-sm font-bold text-gray-500 uppercase tracking-widest">
          <button onClick={() => setStep('tech')} className={cn("hover:text-blue-600 transition-colors", step === 'tech' && "text-blue-600")}>Technology</button>
          <button onClick={() => setStep('guide')} className={cn("hover:text-blue-600 transition-colors", step === 'guide' && "text-blue-600")}>Dermatology Guide</button>
          <button onClick={() => setStep('doctors')} className={cn("hover:text-blue-600 transition-colors", step === 'doctors' && "text-blue-600")}>Doctor Guidance</button>
          <button onClick={() => setStep('privacy')} className={cn("hover:text-blue-600 transition-colors", step === 'privacy' && "text-blue-600")}>Privacy Policy</button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-xl object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Profile</span>
              <span className="text-xs font-black text-gray-900">{user.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="ml-2 p-1 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setStep('doctors')}
            className="hidden sm:block text-sm font-bold bg-gray-900 text-white px-6 py-3 rounded-2xl hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-gray-200"
          >
            Specialist
          </button>
        </div>
      </header>

      <main className="pt-20 pb-20 px-6 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center text-center"
            >
              <div className="self-stretch w-auto mx-[calc(50%-50vw)] mb-0 relative isolate overflow-hidden bg-[#ECF3F7] border-b border-[#CFE0EA] h-[620px] md:h-[680px]">
                <img
                  src={faceAcneImage}
                  alt="AI acne detection hero background"
                  className="absolute inset-0 w-full h-full object-cover object-[center_18%] opacity-65"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-[#EAF1FB]/25" />

                <div className="relative z-10 h-full px-6 md:px-12 py-10 md:py-14 flex flex-col items-start justify-center space-y-8 text-left">
                  <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-gray-900 leading-[0.9] max-w-5xl">
                    Precision Acne <br />
                    <span className="text-blue-600">Detection System.</span>
                  </h1>
                  <p className="text-gray-700 text-base md:text-xl max-w-4xl font-semibold leading-relaxed tracking-tight">
                    Experience the future of dermatology. Simply scan your face and let our state-of-the-art neural networks instantly analyze your breakouts. Uncover the root of your skin concerns and connect with targeted, expert guidance today.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-start gap-4 md:gap-6 pt-2">
                    <div className="flex items-center gap-3 bg-white/95 px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Microscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detection</p>
                        <p className="text-sm font-bold text-gray-900">100+ Markers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/95 px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Privacy</p>
                        <p className="text-sm font-bold text-gray-900">HIPAA Compliant</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/95 px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <Zap className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Speed</p>
                        <p className="text-sm font-bold text-gray-900">Instant Results</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={uploadSectionRef} className="self-stretch w-auto mx-[calc(50%-50vw)] bg-[#ECF3F7] px-6 md:px-10 py-6 md:py-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-7 items-stretch">
                  <div
                    {...getRootProps()}
                    className={cn(
                      "relative h-[300px] md:h-[330px] rounded-[30px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-9 space-y-4 group",
                      isDragActive ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-xl hover:shadow-blue-100/20"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <Upload className="text-blue-600 w-8 h-8" />
                    </div>
                    <div className="space-y-2 text-center max-w-sm">
                      <p className="font-black text-2xl tracking-tight text-gray-900">Upload Image</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.18em]">JPG, PNG, WEBP</p>
                      <p className="text-sm text-gray-600 font-medium">Drag and drop or click to choose a clear front-facing face photo.</p>
                    </div>
                  </div>

                  <div className="relative h-[300px] md:h-[330px] rounded-[30px] bg-gray-900 overflow-hidden group shadow-xl shadow-gray-200">
                    {showCamera ? (
                      <div className="absolute inset-0 flex flex-col">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="w-full h-full object-cover"
                          {...({} as any)}
                        />
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
                          <button 
                            onClick={capture}
                            className="bg-white text-gray-900 px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                          >
                            <CameraIcon className="w-4 h-4" />
                            Capture
                          </button>
                          <button 
                            onClick={() => setShowCamera(false)}
                            className="bg-white/20 backdrop-blur-md text-white p-3 rounded-xl hover:bg-white/30 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-9 space-y-4 text-center">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                          <CameraIcon className="text-white w-8 h-8" />
                        </div>
                        <div className="space-y-2 max-w-sm">
                          <p className="font-black text-2xl tracking-tight text-white">Live Camera</p>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.18em]">Instant Capture</p>
                          <p className="text-sm text-gray-300 font-medium">Use your webcam for a quick face capture and instant acne analysis.</p>
                        </div>
                        <button 
                          onClick={() => setShowCamera(true)}
                          className="mt-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/50"
                        >
                          Launch Camera
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="self-stretch w-auto mx-[calc(50%-50vw)] bg-[#ECF3F7] border-t border-[#CFE0EA] px-6 md:px-10 py-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                  <div className="lg:col-span-5 bg-white rounded-[28px] border border-[#D7E4EC] p-7 space-y-6 shadow-sm">
                    <div className="flex items-center gap-3 text-blue-600">
                      <Info className="w-5 h-5" />
                      <h3 className="font-black text-xl tracking-tight">Legend & Mapping</h3>
                    </div>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                      Multi-modal acne mapping uses marker colors to classify lesion type quickly and consistently.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Whiteheads', dot: 'bg-white border border-gray-300' },
                        { label: 'Blackheads', dot: 'bg-black border border-black' },
                        { label: 'Papules (Red)', dot: 'bg-red-400 border border-red-500' },
                        { label: 'Pustules', dot: 'bg-yellow-200 border border-yellow-600' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 bg-[#F8FBFD] border border-[#E3EDF3] rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:border-[#BDD6E6] hover:shadow-sm"
                        >
                          <span className={cn('w-4 h-4 rounded-full shrink-0', item.dot)} />
                          <span className="text-sm font-bold text-[#1E3A4D]">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-[#FFF2F2] rounded-xl border border-[#FFD7D7]">
                      <p className="text-[10px] text-red-600 font-black uppercase tracking-widest mb-1">Marker Note</p>
                      <p className="text-xs text-red-700 font-semibold leading-relaxed">
                        Red markers highlight inflammatory lesions and are calibrated for broad skin-tone consistency.
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-gradient-to-br from-[#0D1B3A] to-[#0A2348] rounded-[28px] border border-[#1E3A63] p-7 text-white shadow-lg">
                    <div className="flex items-center gap-3 text-blue-300 mb-5">
                      <Activity className="w-5 h-5" />
                      <h3 className="font-black text-xl tracking-tight">Lesion Type Guide</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          title: 'Whiteheads',
                          dot: 'bg-white border border-gray-300',
                          desc: 'Closed clogged pores that appear as small white or skin-colored bumps.',
                        },
                        {
                          title: 'Blackheads',
                          dot: 'bg-black border border-black',
                          desc: 'Open clogged pores where oxidized debris appears dark on the skin surface.',
                        },
                        {
                          title: 'Papules (Red)',
                          dot: 'bg-red-400 border border-red-500',
                          desc: 'Inflamed, red, tender bumps without visible pus, often signaling active irritation.',
                        },
                        {
                          title: 'Pustules',
                          dot: 'bg-yellow-200 border border-yellow-600',
                          desc: 'Inflamed bumps with visible yellow/white pus, usually more active lesions.',
                        },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:border-blue-200/40 hover:shadow-[0_8px_24px_rgba(2,14,34,0.35)]"
                        >
                          <span className={cn('w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0', item.dot)}>
                            <span className="w-2 h-2 rounded-full bg-blue-200/0" />
                          </span>
                          <div className="space-y-1">
                            <p className="text-base text-white font-black leading-tight">{item.title}</p>
                            <p className="text-sm text-blue-100 font-medium leading-snug">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : step === 'tech' ? (
            <TechView onBack={() => setStep('upload')} />
          ) : step === 'guide' ? (
            <GuideView onBack={() => setStep('upload')} onReadDetailedGuide={goToCapabilitiesSection} />
          ) : step === 'privacy' ? (
            <PrivacyView onBack={() => setStep('upload')} />
          ) : step === 'doctors' ? (
            <DoctorsView onBack={() => setStep('upload')} />
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {error && (
                <div className="lg:col-span-12 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-black">Analysis failed</p>
                    <p className="text-xs font-medium">{error}</p>
                    <p className="text-[11px] font-medium text-red-600">{errorTip}</p>
                  </div>
                </div>
              )}

              {/* Left Column: Visual Analysis */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-[32px] border border-gray-200 overflow-hidden relative shadow-lg shadow-gray-200/50">
                  <div className="absolute top-6 left-6 z-10 flex gap-3">
                    <button 
                      onClick={reset}
                      className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl hover:bg-white transition-all hover:scale-105 active:scale-95"
                    >
                      <X className="w-6 h-6 text-gray-900" />
                    </button>
                    <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Analysis</span>
                    </div>
                  </div>
                  
                  <div className="relative h-[420px] md:h-[500px] bg-gray-50">
                    {image && (
                      <img 
                        src={image} 
                        alt="Face Analysis" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    {analyzing && (
                      <div className="absolute inset-0 bg-[#F9FAFB]/90 backdrop-blur-md flex flex-col items-center justify-center px-8">
                        <div className="w-full max-w-sm space-y-5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.18em]">AI Analysis Pipeline</p>
                            <p className="text-sm font-black text-gray-700">{Math.round(analysisProgress)}%</p>
                          </div>
                          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              animate={{ width: `${analysisProgress}%` }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="h-full bg-blue-600 rounded-full"
                            />
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                              <Activity className="text-blue-600 w-4 h-4 animate-pulse" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-gray-900 font-bold text-base tracking-tight">Processing Skin Data</p>
                              <p className="text-gray-500 text-xs font-medium">{analysisStage}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!analyzing && result?.regions.map((region, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.03, type: "spring", stiffness: 200 }}
                        className={cn(
                          "absolute w-6 h-6 rounded-full border-4 shadow-2xl -translate-x-1/2 -translate-y-1/2 group cursor-help transition-transform hover:scale-150 z-10",
                          ACNE_COLORS[region.type]
                        )}
                        style={{ left: `${region.x}%`, top: `${region.y}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-30">
                          <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap capitalize shadow-2xl flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", ACNE_COLORS[region.type])} />
                            {region.type}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex -space-x-3">
                        {Object.entries(ACNE_COLORS).map(([type, color]) => (
                          <div key={type} className={cn("w-6 h-6 rounded-full border-2 border-white shadow-sm", color)} title={type} />
                        ))}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Detection Legend</span>
                        <span className="text-xs font-bold text-gray-900">Multi-modal Mapping</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 rounded-2xl">
                      <span className="text-xs font-bold text-gray-900">{result?.regions.length || 0} Lesions Identified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Primary Metrics */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-7 rounded-[28px] border border-gray-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Info className="w-5 h-5" />
                    <h3 className="font-bold text-base">Clinical Summary</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {result?.summary}
                  </p>
                </div>

                {/* Severity & Score */}
                <div className="bg-gray-900 text-white p-8 rounded-[32px] shadow-2xl shadow-blue-900/20 space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Acne Type</p>
                      <h2 className="text-2xl font-black tracking-tight">{displayAcneType}</h2>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Percentage</p>
                      <h2 className="text-3xl font-black tracking-tight text-blue-400">{displayPercentage}%</h2>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Severity Score</p>
                        <span className="text-2xl font-black text-white">{displayScore}<span className="text-sm text-gray-500">/100</span></span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${displayScore}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]",
                            displayScore < 30 ? "bg-green-400" :
                            displayScore < 60 ? "bg-orange-400" :
                            "bg-red-400"
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-white/10">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Problem</p>
                        <p className="text-sm font-medium text-gray-300 leading-relaxed">{displayProblem}</p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Requirements</p>
                        <div className="flex flex-wrap gap-2">
                          {displayRequirements.map((req, i) => (
                            <span key={i} className="text-[10px] font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width Tabs */}
              <div className="lg:col-span-12 space-y-6">
                {canShowDetailedResults ? (
                  <>
                    <div className="flex p-1.5 bg-gray-100 rounded-2xl gap-1 max-w-md">
                      <button 
                        onClick={() => setActiveTab('routine')}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                          activeTab === 'routine' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        <Droplets className="w-4 h-4" />
                        Daily Routine
                      </button>
                      <button 
                        onClick={() => setActiveTab('insights')}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                          activeTab === 'insights' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        <Stethoscope className="w-4 h-4" />
                        Derm Insights
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === 'routine' ? (
                        <motion.div
                          key="routine"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="grid grid-cols-1 xl:grid-cols-2 gap-4"
                        >
                          {displayRecommendations.map((rec, i) => (
                            <div key={i} className="bg-white p-6 rounded-[24px] border border-gray-100 flex flex-col gap-5 hover:border-blue-300 transition-all group shadow-sm">
                              <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors duration-500">
                                    {rec.category === 'cleanser' && <Droplets className="text-blue-600 w-6 h-6 group-hover:text-white" />}
                                    {rec.category === 'treatment' && <Zap className="text-blue-600 w-6 h-6 group-hover:text-white" />}
                                    {rec.category === 'moisturizer' && <Sparkles className="text-blue-600 w-6 h-6 group-hover:text-white" />}
                                    {rec.category === 'sunscreen' && <Sun className="text-blue-600 w-6 h-6 group-hover:text-white" />}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{rec.category}</span>
                                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Derm Recommended</span>
                                    </div>
                                    <h4 className="font-black text-xl text-gray-900 leading-tight">{rec.productName}</h4>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <p className="text-sm text-gray-500 leading-relaxed font-medium">{rec.description}</p>
                                
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">How to Use</p>
                                  <p className="text-xs font-bold text-gray-700 leading-relaxed">{rec.howToUse}</p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {rec.ingredients.map((ing, j) => (
                                    <span key={j} className="text-[10px] bg-white text-gray-600 px-3 py-1.5 rounded-lg font-bold border border-gray-200">
                                      {ing}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="insights"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          {/* Triggers */}
                          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-4 text-orange-500">
                              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-5 h-5" />
                              </div>
                              <h3 className="font-black text-xl tracking-tight">Potential Triggers</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {displayTriggers.map((trigger, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-orange-50/50 transition-colors">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 shrink-0" />
                                  <div className="space-y-1">
                                    <h4 className="font-bold text-gray-900">{trigger.title}</h4>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{trigger.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Lifestyle Tips */}
                          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-4 text-green-600">
                              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                                <Lightbulb className="w-5 h-5" />
                              </div>
                              <h3 className="font-black text-xl tracking-tight">Lifestyle Optimization</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {displayLifestyleTips.map((tip, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                  </div>
                                  <p className="text-sm text-gray-700 font-bold">{tip}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Clinical Advice */}
                          <div className="bg-blue-600 text-white p-8 rounded-[32px] shadow-2xl shadow-blue-200 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center gap-4 relative z-10">
                              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Stethoscope className="w-5 h-5" />
                              </div>
                              <h3 className="font-black text-xl tracking-tight">Professional Advice</h3>
                            </div>
                            <p className="text-base text-blue-50 leading-relaxed font-medium relative z-10 italic">
                              "{displayClinicalAdvice}"
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 text-sm text-gray-600 font-medium">
                    Detailed routine and dermatology insights will appear once image analysis is complete.
                  </div>
                )}

                <button 
                  onClick={reset}
                  className="w-full max-w-sm py-4 bg-white border-2 border-gray-900 text-gray-900 rounded-2xl font-black hover:bg-gray-900 hover:text-white transition-all flex items-center justify-center gap-3 group shadow-lg"
                >
                  <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
                  Restart Analysis
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Capabilities Section */}
      {step === 'upload' && (
        <section
          ref={capabilitiesSectionRef}
          className="py-20 px-6 bg-gradient-to-b from-[#EEF4F9] to-[#E6EFF6] border-y border-[#D3E1EC]"
        >
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-[28px] bg-[#071B43] text-white p-8 md:p-10 shadow-xl shadow-blue-900/20">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-[11px] font-black tracking-[0.2em] uppercase">
                <Sparkles className="w-4 h-4 text-blue-200" />
                Diagnostic Stack
              </div>
              <h2 className="mt-5 text-3xl md:text-4xl leading-tight font-black tracking-tight">
                Clinical Intelligence
                <br />
                For Every Face Scan
              </h2>
              <p className="mt-4 text-blue-100/90 text-sm md:text-base leading-relaxed font-medium max-w-md">
                Each analysis combines lesion detection, severity grading, and privacy-safe processing to generate consistent acne insights in one flow.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3">
                  <p className="text-xl font-black">100+</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100/80">markers</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3">
                  <p className="text-xl font-black">&lt;10s</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100/80">analysis flow</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-[24px] bg-white border border-[#D5E2EC] p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Dna className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#0E223D]">CNN Lesion Mapping</h3>
                <p className="mt-2 text-sm font-medium text-[#3D5870] leading-relaxed">
                  Detects acne regions and lesion clusters from uploaded or live-captured face images.
                </p>
              </div>

              <div className="rounded-[24px] bg-white border border-[#D5E2EC] p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                  <HeartPulse className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#0E223D]">Severity Index</h3>
                <p className="mt-2 text-sm font-medium text-[#3D5870] leading-relaxed">
                  Converts lesion spread and inflammation signals into clear, trackable severity metrics.
                </p>
              </div>

              <div className="rounded-[24px] bg-white border border-[#D5E2EC] p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#0E223D]">Privacy Controlled</h3>
                <p className="mt-2 text-sm font-medium text-[#3D5870] leading-relaxed">
                  Analysis and recommendations are generated with a secure, patient-first data workflow.
                </p>
              </div>

              <div className="rounded-[24px] bg-[#EAF2FF] border border-[#CFE0FF] p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#0E223D]">Actionable Guidance</h3>
                <p className="mt-2 text-sm font-medium text-[#345472] leading-relaxed">
                  Produces routine suggestions and lesion-wise insights that are easy to follow day to day.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Face Acne Matter */}
      {step === 'upload' && (
        <section className="py-16 px-6 bg-[#E7E7E7] border-b border-[#D2D2D2]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="relative rounded-[22px] overflow-hidden h-[520px] bg-gray-200 shadow-sm">
                <img
                  src={verticalImage1}
                  alt="Face acne consultation sample"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#A22B2B]/30 via-transparent to-transparent" />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-8 text-left">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08] text-[#9E2428]">
                Face Acne Matter -<br />
                Smart Acne Analysis
              </h2>

              <p className="text-base md:text-lg text-[#1C2A38] leading-relaxed font-medium max-w-3xl">
                When your skin needs precision care, our Face Acne Matter workflow helps identify lesion patterns, estimate severity, and deliver targeted skincare guidance from routine to advanced concerns.
              </p>

              <p className="text-base md:text-lg text-[#1C2A38] leading-relaxed font-medium max-w-3xl">
                With consistent face scans and structured recommendations, you can track acne progression and make confident, informed skincare decisions.
              </p>

              <button
                onClick={goToUploadImageSection}
                className="mt-2 inline-flex items-center justify-center bg-[#9E2428] hover:bg-[#8A1F22] text-white font-black text-base md:text-lg rounded-xl px-8 py-3 transition-colors"
              >
                Try This
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Face Acne */}
      {step === 'upload' && (
        <section className="py-16 px-6 bg-[#E7E7E7] border-b border-[#D2D2D2]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 text-left space-y-8">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-[1.1] text-[#9E2428]">
                Why Choose AcneScan
                <br />
                For Face Acne Care?
              </h2>

              <ul className="space-y-2 text-[#1B2733] text-base md:text-lg font-medium leading-relaxed list-disc pl-7">
                <li>Accurate lesion-type mapping for whiteheads, blackheads, papules, and pustules</li>
                <li>Consistent severity scoring to track improvement across repeated scans</li>
                <li>Personalized recommendations based on acne pattern and skin requirements</li>
                <li>Live camera mode for instant face capture and immediate analysis flow</li>
                <li>Feature-rich dashboard with routine planning and dermatology insights</li>
                <li>Secure, privacy-focused workflow built for safe image-based screening</li>
              </ul>

              <button
                onClick={goToLiveCameraSection}
                className="inline-flex items-center justify-center bg-[#9E2428] hover:bg-[#8A1F22] text-white font-black text-base rounded-xl px-10 py-4 transition-colors"
              >
                Try these features
              </button>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-[22px] overflow-hidden h-[520px] bg-gray-200 shadow-sm">
                <img
                  src={verticalImage2}
                  alt="Face acne care and dermatology consultation"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#A22B2B]/28 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trail Samples */}
      {step === 'upload' && (
        <section className="py-14 px-6 bg-[#F4F8FB] border-b border-[#D8E6EF]">
          <div className="max-w-6xl mx-auto space-y-5">
            <div className="space-y-1 text-center">
              <h2 className="text-3xl font-black tracking-tight text-[#0A3A57]">Trail Samples</h2>
              <p className="text-sm text-[#2B5C74] font-medium">
                Review real face-acne sample images to understand lesion patterns, severity variation, and scan-ready framing.
              </p>
            </div>

            <div className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              }}
            >
              <motion.div
                className="flex gap-4 w-max"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 42, ease: 'linear', repeat: Infinity }}
              >
                {[...TRAIL_SAMPLE_IMAGES, ...TRAIL_SAMPLE_IMAGES].map((item, index) => (
                  <div
                    key={`${item.src}-${index}`}
                    className="shrink-0 w-[280px] sm:w-[340px] md:w-[380px] rounded-2xl border border-[#C8DCE8] bg-white overflow-hidden shadow-sm"
                  >
                    <div className="h-[200px] sm:h-[220px] bg-gray-100">
                      <img
                        src={item.src}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm font-black text-[#0A3A57] tracking-tight">{item.title}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {step === 'upload' && (
        <section className="py-12 px-6 bg-[#ECF3F7] border-t border-b border-[#CFE0EA]">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-[#0A3A57]">Frequently Asked Questions - Acne Face</h2>
              <p className="text-[#21506A] text-sm max-w-5xl">
                Explore clear answers about acne face image analysis, result reliability, and how to use these metrics for better daily skincare decisions.
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="rounded-2xl border border-[#A9CADB] bg-white/80 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between gap-4 p-4 text-left"
                    >
                      <span className="text-lg font-black tracking-tight text-[#0A3A57]">{item.question}</span>
                      <span className="w-10 h-10 rounded-full border-2 border-[#0A7EA4] flex items-center justify-center shrink-0">
                        <Plus className={cn('w-5 h-5 text-[#0A7EA4] transition-transform', isOpen && 'rotate-45')} />
                      </span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4"
                        >
                          <p className="text-[#21506A] text-sm font-medium leading-relaxed max-w-5xl">{item.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
              <span className="font-black text-2xl tracking-tighter">Face AcniScan</span>
            </div>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Empowering individuals with clinical-grade skin analysis through the power of artificial intelligence.
            </p>
          </div>
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-widest text-gray-900">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400 font-medium">
                <li><a href="#" className="hover:text-blue-600">Analysis Engine</a></li>
                <li><a href="#" className="hover:text-blue-600">Derm API</a></li>
                <li><a href="#" className="hover:text-blue-600">Mobile App</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-widest text-gray-900">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400 font-medium">
                <li><a href="#" className="hover:text-blue-600">About Us</a></li>
                <li><a href="#" className="hover:text-blue-600">Research</a></li>
                <li><a href="#" className="hover:text-blue-600">Careers</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-widest text-gray-900">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400 font-medium">
                <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600">Medical Disclaimer</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2026 Face AcniScan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function TechView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:gap-3 transition-all">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
      </button>
      <div className="space-y-6">
        <h2 className="text-5xl font-black tracking-tighter">Medical High-Demand Technologies</h2>
        <p className="text-xl text-gray-500 font-medium max-w-3xl">AcneScan AI leverages cutting-edge computer vision and deep learning to revolutionize dermatological diagnostics.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { icon: Microscope, title: "Convolutional Neural Networks", desc: "Our models are trained on diverse datasets to recognize acne patterns across all Fitzpatrick skin types." },
          { icon: Dna, title: "Multi-modal Mapping", desc: "We combine visual data with metadata to provide a holistic view of skin health and potential underlying causes." },
          { icon: ShieldCheck, title: "Edge Computing", desc: "Analysis is performed with minimal latency, ensuring instant feedback without compromising data security." },
          { icon: Activity, title: "Predictive Analytics", desc: "Future versions will predict flare-ups based on lifestyle data and historical skin patterns." }
        ].map((item, i) => (
          <div key={i} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
              <item.icon className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="font-black text-xl">{item.title}</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function GuideView({ onBack, onReadDetailedGuide }: { onBack: () => void; onReadDetailedGuide: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:gap-3 transition-all">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
      </button>
      <div className="space-y-6">
        <h2 className="text-5xl font-black tracking-tighter">Dermatology Guide</h2>
        <p className="text-xl text-gray-500 font-medium max-w-3xl">Comprehensive insights into the health of your skin, hair, nails, and mucous membranes.</p>
      </div>
      <div className="grid grid-cols-1 gap-8">
        {[
          { title: "Skin Health", desc: "The body's largest organ. Learn about the barrier function, hydration, and common conditions like acne, eczema, and psoriasis." },
          { title: "Hair & Scalp", desc: "Understanding hair growth cycles, scalp health, and the impact of nutrition and stress on hair quality." },
          { title: "Nail Diagnostics", desc: "Nails can reveal systemic health issues. Learn what changes in color, texture, and shape might mean." },
          { title: "Mucous Membranes", desc: "The delicate linings of the mouth, nose, and eyes. How to identify early signs of dermatological conditions in these areas." }
        ].map((item, i) => (
          <div key={i} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-black text-2xl text-gray-900">{item.title}</h3>
            <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
            <button
              type="button"
              onClick={onReadDetailedGuide}
              className="text-blue-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all"
            >
              Read Detailed Guide <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PrivacyView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:gap-3 transition-all">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
      </button>
      <div className="bg-white p-12 rounded-[48px] border border-gray-100 shadow-sm space-y-8">
        <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-4xl font-black tracking-tight">Medical Privacy Policy</h2>
        <div className="space-y-6 text-gray-600 font-medium leading-relaxed">
          <p>At AcneScan AI, we prioritize the security and confidentiality of your medical data. Our platform is built with HIPAA-compliant standards to ensure your personal health information (PHI) is protected at all times.</p>
          <h3 className="text-xl font-black text-gray-900">Data Collection & Use</h3>
          <p>We only collect images and metadata necessary for skin analysis. Your data is encrypted during transmission and storage. We do not sell your personal information to third parties.</p>
          <h3 className="text-xl font-black text-gray-900">Your Rights</h3>
          <p>You have the right to access, correct, or delete your data at any time. Our system is designed to provide you with full control over your diagnostic history.</p>
        </div>
      </div>
    </motion.div>
  );
}

function DoctorsView({ onBack }: { onBack: () => void }) {
  const specialists = [
    { name: "Dr. Rinky Kapoor", hospital: "The Esthetic Clinics", location: "Mumbai / India", status: "Open Now", specialty: "Cosmetic Dermatology & Scar Removal", description: "Recognized for expertise in cosmetic dermatology, scar removal, and treating complex acne." },
    { name: "Dr. Niti Gaur", hospital: "Citrine Clinic", location: "Gurgaon, India", status: "Open Now", specialty: "Acne & Pigmentation Specialist", description: "Founder of Citrine Clinic, known for treating acne, pigmentation, and anti-aging." },
    { name: "Dr. Chytra V. Anand", hospital: "Kosmoderma Clinics", location: "Bangalore, India", status: "Open Now", specialty: "Celebrity Cosmetic Dermatologist", description: "A renowned celebrity cosmetic dermatologist and founder of Kosmoderma Clinics." },
    { name: "Dr. Deepti Rana", hospital: "Max Hospital", location: "Delhi, India", status: "Open Now", specialty: "Laser & Aesthetic Procedures", description: "Experienced dermatologist with expertise in laser and aesthetic procedures." },
    { name: "Dr. Monica Bambroo", hospital: "Artemis Hospital", location: "Gurgaon, India", status: "Open Now", specialty: "Dermatology & Cosmetology", description: "Specialist based at Artemis Hospital, Gurgaon, specializing in dermatology and cosmetology." },
    { name: "Dr. Puneet Aggarwal", hospital: "Max Hospital", location: "Delhi, India", status: "Open Now", specialty: "Acne Management Expert", description: "Senior dermatologist with extensive experience in acne management." },
    { name: "Dr. Purvi Shah", hospital: "HN Reliance Hospital", location: "Mumbai, India", status: "Open Now", specialty: "Acne Treatment Specialist", description: "Known for expertise in acne treatment at HN Reliance Hospital." },
    { name: "Dr. Jayanta Kumar Barua", hospital: "Manipal Hospitals", location: "Bangalore, India", status: "Open Now", specialty: "Dermatology Expert", description: "Expert in dermatology with extensive clinical experience at Manipal Hospitals." },
    { name: "Dr. Jaidev Yadav", hospital: "Manipal Hospital", location: "Multiple Locations, India", status: "Open Now", specialty: "Acne Treatment Specialist", description: "Specialist focusing on advanced acne treatments and skin care." },
    { name: "Dr. Sandra Lee", hospital: "Global Recognition", location: "USA / International", status: "Open Now", specialty: "Dr. Pimple Popper", description: "Internationally renowned for dermatology and video-based education on acne treatment." }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:gap-3 transition-all">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
      </button>
      <div className="space-y-6">
        <h2 className="text-5xl font-black tracking-tighter">Top Acne Care Hospitals & Specialists</h2>
        <p className="text-xl text-gray-500 font-medium max-w-3xl">Direct access to world-renowned dermatologists and top-tier medical institutions for specialized acne treatment.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {specialists.map((doc, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between hover:border-blue-400 hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[64px] -mr-8 -mt-8 group-hover:bg-blue-600 transition-colors" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
                <Stethoscope className="w-7 h-7 text-gray-400 group-hover:text-blue-600" />
              </div>
              <div>
                <h3 className="font-black text-xl text-gray-900 group-hover:text-blue-600 transition-colors">{doc.name}</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{doc.specialty}</p>
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3">{doc.description}</p>
            </div>

            <div className="relative z-10 space-y-3 mt-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="w-3 h-3" />
                  <span className="text-xs font-bold">{doc.hospital}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{doc.location}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                  doc.status === "Open Now" ? "bg-green-50 text-green-600" : 
                  doc.status === "Closing Soon" ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                )}>
                  {doc.status}
                </div>
                <button className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
