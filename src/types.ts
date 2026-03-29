export type AcneType = 'whitehead' | 'blackhead' | 'papule' | 'pustule';
export type SeverityLevel = 'mild' | 'moderate' | 'severe';

export interface AcneRegion {
  type: AcneType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  confidence: number;
}

export interface Recommendation {
  category: 'cleanser' | 'treatment' | 'moisturizer' | 'sunscreen';
  productName: string;
  description: string;
  ingredients: string[];
  howToUse: string;
}

export interface AnalysisResult {
  regions: AcneRegion[];
  severity: SeverityLevel;
  score: number; // 0-100
  summary: string;
  acneType: string;
  percentage: number;
  problem: string;
  requirements: string[];
  recommendations: Recommendation[];
  dermatologyInsights: {
    triggers: { title: string; description: string }[];
    lifestyleTips: string[];
    clinicalAdvice: string;
  };
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: string;
}
