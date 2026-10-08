import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Atom,
  Beaker,
  BookOpen,
  Brain,
  ChevronRight,
  CloudRain,
  FlaskConical,
  Gauge,
  Globe2,
  Microscope,
  Play,
  RefreshCcw,
  Scale,
  ShieldAlert,
  Snowflake,
  Sun,
  ThermometerSnowflake,
  Wheat,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TargetChoice = 'none' | 'moderate' | 'aggressive' | 'emergency';
type ParticleChoice = 'sulfate' | 'caco3' | 'alumina' | 'future';
type SeasonChoice = 'annual' | 'spring' | 'autumn';
type LocationChoice = 'tropical' | 'subtropical' | 'polar';
type ResearchChoice = 'none' | 'lab' | 'monitoring' | 'adaptation';

type Indicators = {
  temperature: number;
  ice: number;
  food: number;
  rain: number;
  trust: number;
  knowledge: number;
  aerosolBurden: number;
  infrastructure: number;
};

type HistoryPoint = Indicators & {
  year: number;
  withoutSAI: number;
};

type StrategyEntry = {
  year: number;
  particle: ParticleChoice;
  target: TargetChoice;
  season: SeasonChoice;
  location: LocationChoice;
  research: ResearchChoice;
  cost: number;
  event: string;
};

type Report = {
  year: number;
  title: string;
  text: string;
  event: string;
  previous: Indicators;
  current: Indicators;
  cost: number;
  choices: StrategyEntry;
};

const START_YEAR = 2030;
const END_YEAR = 2130;
const POINTS_PER_DECADE = 7;

const INITIAL_STATE: Indicators = {
  temperature: 1.6,
  ice: 70,
  food: 80,
  rain: 85,
  trust: 65,
  knowledge: 8,
  aerosolBurden: 0,
  infrastructure: 90,
};

const targetMeta: Record<TargetChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No SAI / pause', cost: 0, short: 'Avoids aerosol side effects, but background warming continues.' },
  moderate: { label: 'Stabilize near 1.5°C', cost: 2, short: 'Balanced climate control with moderate side effects.' },
  aggressive: { label: 'Aggressive cooling near 1.0°C', cost: 4, short: 'Reduces heat stress, but raises hydrological and agricultural side-effect pressure.' },
  emergency: { label: 'Emergency cooling near 0.8°C', cost: 5, short: 'Crisis intervention with high overcooling, rainfall disruption and loss of trust.' },
};

const particleMeta: Record<ParticleChoice, { label: string; short: string; cost: number; known: string; uncertainty: string }> = {
  sulfate: {
    label: 'Sulfate particles',
    short: 'Known baseline',
    cost: 1,
    known: 'Known cooling, known lifetime, known uncertainties',
    uncertainty: 'Most studied material, but linked to stratospheric heating, ozone chemistry and deposition concerns.',
  },
  caco3: {
    label: 'CaCO₃ / calcite particles',
    short: 'Partly known solid alternative',
    cost: 2,
    known: 'Partly known cooling, partly known lifetime, partly known uncertainties',
    uncertainty: 'Potentially useful alternative; acid uptake, ageing and heterogeneous chemistry remain uncertain.',
  },
  alumina: {
    label: 'Alumina particles',
    short: 'High-performance but ozone-uncertain',
    cost: 3,
    known: 'Promising optical behaviour, uncertain surface chemistry',
    uncertainty: 'Can reduce some sulfate limitations, but chlorine activation and ozone loss are highly uncertain.',
  },
  future: {
    label: 'Future engineered particle',
    short: 'Locked high-uncertainty material',
    cost: 4,
    known: 'Unknown cooling, unknown lifetime, unknown uncertainty',
    uncertainty: 'Strong only if research is high. Low knowledge creates large chemistry, rainfall and trust penalties.',
  },
};

const seasonMeta: Record<SeasonChoice, { label: string; cost: number; short: string }> = {
  annual: { label: 'Annual injection', cost: 0, short: 'Reference strategy; predictable but not regionally optimal.' },
  spring: { label: 'Spring injection', cost: 1, short: 'More efficient cooling, but stronger rainfall trade-off in the game.' },
  autumn: { label: 'Autumn injection', cost: 1, short: 'Better ice and India-rainfall trade-off in the seasonal paper.' },
};

const locationMeta: Record<LocationChoice, { label: string; cost: number; short: string }> = {
  tropical: { label: 'Tropical / equatorial injection', cost: 0, short: 'More global spread, but weaker polar rescue.' },
  subtropical: { label: 'Subtropical injection', cost: 1, short: 'Middle strategy between global control and polar targeting.' },
  polar: { label: 'Polar injection', cost: 2, short: 'Strong ice protection, but high rainfall redistribution and governance pressure.' },
};

const researchMeta: Record<ResearchChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No support action', cost: 0, short: 'Saves points, but uncertainty and social vulnerability remain.' },
  lab: { label: 'Laboratory particle testing', cost: 2, short: 'Raises knowledge; needed for alternative materials.' },
  monitoring: { label: 'Monitoring and open data', cost: 2, short: 'Raises trust, lowers event likelihood and improves infrastructure.' },
  adaptation: { label: 'Adaptation and compensation', cost: 2, short: 'Protects food/rain/trust when some regions are harmed.' },
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function roundIndicators(next: Indicators): Indicators {
  return {
    temperature: Number(next.temperature.toFixed(2)),
    ice: Math.round(clamp(next.ice)),
    food: Math.round(clamp(next.food)),
    rain: Math.round(clamp(next.rain)),
    trust: Math.round(clamp(next.trust)),
    knowledge: Math.round(clamp(next.knowledge)),
    aerosolBurden: Math.round(clamp(next.aerosolBurden)),
    infrastructure: Math.round(clamp(next.infrastructure)),
  };
}

function baselineTemperature(year: number): number {
  return Number((1.6 + (year - START_YEAR) * 0.025).toFixed(2));
}

function targetTemperature(target: TargetChoice, withoutSAI: number): number {
  if (target === 'none') return withoutSAI;
  if (target === 'moderate') return 1.5;
  if (target === 'aggressive') return 1.0;
  return 0.8;
}

function computeCost(
  target: TargetChoice,
  particle: ParticleChoice,
  season: SeasonChoice,
  location: LocationChoice,
  research: ResearchChoice,
): number {
  let cost = targetMeta[target].cost;
  if (target !== 'none') cost += particleMeta[particle].cost;
  if (target !== 'none') cost += seasonMeta[season].cost;
  if (target !== 'none') cost += locationMeta[location].cost;
  cost += researchMeta[research].cost;
  return cost;
}

function earthStatus(indicators: Indicators): { label: string; detail: string; emoji: string } {
  if (indicators.trust < 20 || indicators.rain < 20 || indicators.food < 20 || indicators.infrastructure < 20 || indicators.aerosolBurden > 90) {
    return {
      label: 'Crisis Earth',
      detail: 'Human, hydrological, or governance stability is in critical failure.',
      emoji: '⚠️',
    };
  }
  if (indicators.temperature >= 2.5) {
    return {
      label: 'Extreme Heat Earth',
      detail: 'Unmitigated global warming dominates regional ecosystems.',
      emoji: '🔥',
    };
  }
  if (indicators.temperature <= 0.9) {
    return {
      label: 'Overcooled Earth',
      detail: 'Aggressive cooling reduces direct sunlight and monsoon rainfall.',
      emoji: '❄️',
    };
  }
  if (indicators.aerosolBurden > 65) {
    return {
      label: 'Aerosol-Strained Earth',
      detail: 'Global temperature is stabilized, but aerosol accumulation causes high environmental strain.',
      emoji: '🌫️',
    };
  }
  return {
    label: 'Managed Earth System',
    detail: 'Temperature targets are maintained with balanced hydrological trade-offs.',
    emoji: '🌍',
  };
}

/* --- DYNAMIC ATMOSPHERIC VISUAL CANVAS --- */
function DynamicEarthCanvas({ indicators, target, particle }: { indicators: Indicators; target: TargetChoice; particle: ParticleChoice }) {
  const status = earthStatus(indicators);
  const burdenPercent = indicators.aerosolBurden;
  const rainPercent = indicators.rain;
  const foodPercent = indicators.food;
  const tempAnomaly = indicators.temperature;

  const solarIrradiance = Math.max(30, Math.round(100 - burdenPercent * 0.4 - (target === 'aggressive' ? 10 : target === 'emergency' ? 20 : 0)));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl min-h-[380px] flex flex-col justify-between p-6">
      
      {/* Stratospheric Haze Layer */}
      <div 
        className="absolute inset-x-0 top-0 h-2/5 transition-all duration-1000 z-10 pointer-events-none flex flex-col items-center justify-start pt-3"
        style={{
          background: `linear-gradient(to bottom, rgba(217, 119, 6, ${burdenPercent / 120}), rgba(15, 23, 42, 0))`
        }}
      >
        <div className="absolute inset-0 opacity-40 overflow-hidden">
          <div className="absolute top-2 left-1/4 w-2 h-2 bg-amber-200 rounded-full blur-[1px] animate-ping" />
          <div className="absolute top-8 left-2/3 w-3 h-3 bg-cyan-200 rounded-full blur-[1px] animate-pulse" />
          <div className="absolute top-4 left-1/2 w-2 h-2 bg-slate-100 rounded-full blur-[1px] animate-ping" />
        </div>
        <span className="text-xs uppercase tracking-widest text-amber-200/80 font-semibold bg-slate-950/70 px-3 py-1 rounded-full border border-amber-500/30 backdrop-blur-md">
          Stratospheric Aerosol Burden: {burdenPercent}% ({particleMeta[particle].label})
        </span>
      </div>

      {/* Dynamic Solar Sky Overlay */}
      <div 
        className="absolute inset-0 transition-all duration-1000 -z-0 pointer-events-none"
        style={{
          backgroundColor: tempAnomaly > 2.0 ? 'rgba(153, 27, 27, 0.25)' : 'rgba(14, 116, 144, 0.15)',
          filter: `brightness(${Math.max(0.4, solarIrradiance / 100)})`
        }}
      />

      {/* Sun & System Status Panel */}
      <div className="relative z-20 flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
          <Sun className={`w-7 h-7 ${solarIrradiance < 60 ? 'text-amber-600' : 'text-amber-400'} animate-spin-slow`} />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Solar Irradiance</p>
            <p className="text-sm font-bold text-slate-100">{solarIrradiance}% Surface Normal</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
          <span className="text-2xl">{status.emoji}</span>
          <div>
            <p className="text-xs font-bold text-slate-100">{status.label}</p>
            <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">{status.detail}</p>
          </div>
        </div>
      </div>

      {/* Rain & Monsoon Visualizer */}
      <div className="relative z-20 my-4 pointer-events-none">
        <div className="flex items-center justify-between bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <CloudRain className={`w-5 h-5 ${rainPercent < 50 ? 'text-amber-500' : 'text-cyan-400'}`} />
            <span className="text-xs font-semibold text-slate-200">Precipitation & Monsoon Health ({rainPercent}%)</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded ${rainPercent < 50 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'}`}>
            {rainPercent < 50 ? 'Drought Warning' : 'Stable Hydrology'}
          </span>
        </div>

        <div className="h-16 w-full relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50">
          {rainPercent < 40 ? (
            <div className="absolute inset-0 flex items-center justify-center text-amber-500/80 text-xs font-semibold uppercase tracking-wider">
              Severe Hydrological Deficit — Drought Stress
            </div>
          ) : (
            <div 
              className="absolute inset-0 opacity-50 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:16px_16px] animate-bounce"
              style={{ animationDuration: `${Math.max(0.4, 180 / rainPercent)}s` }}
            />
          )}
        </div>
      </div>

      {/* Surface Agriculture & Crops */}
      <div className="relative z-20 bg-slate-950/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${foodPercent < 50 ? 'bg-amber-950/50 border-amber-800 text-amber-400' : 'bg-emerald-950/50 border-emerald-800 text-emerald-400'}`}>
            <Wheat className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Global Crop Yield & Agriculture</div>
            <div className="text-[11px] text-slate-400">Impacted by dimming (sunlight) and disrupted rain cycles.</div>
          </div>
        </div>

        <div className="w-full sm:w-40 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-slate-400">Crop Health</span>
            <span className="font-bold text-slate-200">{foodPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${foodPercent < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${foodPercent}%` }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

export default function App() {
  const [year, setYear] = useState(START_YEAR);
  const [indicators, setIndicators] = useState<Indicators>(INITIAL_STATE);
  const [history, setHistory] = useState<HistoryPoint[]>([
    { year: START_YEAR, ...INITIAL_STATE, withoutSAI: INITIAL_STATE.temperature },
  ]);
  const [target, setTarget] = useState<TargetChoice>('moderate');
  const [particle, setParticle] = useState<ParticleChoice>('sulfate');
  const [season, setSeason] = useState<SeasonChoice>('annual');
  const [location, setLocation] = useState<LocationChoice>('tropical');
  const [research, setResearch] = useState<ResearchChoice>('none');

  const availablePoints = POINTS_PER_DECADE;
  const currentCost = computeCost(target, particle, season, location, research);
  const pointsRemaining = availablePoints - currentCost;

  const processDecade = () => {
    if (currentCost > availablePoints) return;

    const nextYear = year + 10;
    const withoutSAI = baselineTemperature(nextYear);
    let next: Indicators = { ...indicators };

    let desiredTemp = targetTemperature(target, withoutSAI);
    next.temperature = Math.max(0.4, desiredTemp);

    if (target === 'moderate') {
      next.food -= 1;
      next.rain -= 3;
      next.aerosolBurden += 7;
    } else if (target === 'aggressive') {
      next.food -= 5;
      next.rain -= 11;
      next.aerosolBurden += 15;
    } else if (target === 'emergency') {
      next.food -= 12;
      next.rain -= 20;
      next.aerosolBurden += 22;
    }

    if (research === 'lab') next.knowledge += 9;
    if (research === 'monitoring') next.trust += 9;
    if (research === 'adaptation') next.food += 8;

    const rounded = roundIndicators(next);

    setIndicators(rounded);
    setHistory((prev) => [...prev, { year: nextYear, ...rounded, withoutSAI }]);
    setYear(nextYear);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-200 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Top Control Bar */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">SAI Governance Challenge</h1>
            <p className="text-sm text-slate-400">Planning Decade: {year} to {year + 10}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><b>Points Left:</b> {pointsRemaining} / {availablePoints}</div>
            <button 
              onClick={processDecade} 
              disabled={pointsRemaining < 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition disabled:bg-slate-700"
            >
              Advance Decade
            </button>
          </div>
        </div>

        {/* Dynamic World Visual Canvas */}
        <DynamicEarthCanvas indicators={indicators} target={target} particle={particle} />

        {/* Charts & Analytical Views */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-xl font-black text-white">Temperature Trajectory</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis domain={[0, 4.0]} stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Line type="linear" dataKey="withoutSAI" stroke="#ef4444" strokeDasharray="4 4" name="Baseline (No SAI)" />
                  <Line type="linear" dataKey="temperature" stroke="#60a5fa" strokeWidth={3} name="Managed Temp" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-xl font-black text-white">Hydrological & Agriculture Index</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis domain={[0, 100]} stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Line type="linear" dataKey="rain" stroke="#2dd4bf" strokeWidth={2} name="Monsoon Rain" />
                  <Line type="linear" dataKey="food" stroke="#f59e0b" strokeWidth={2} name="Crop Yield" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
