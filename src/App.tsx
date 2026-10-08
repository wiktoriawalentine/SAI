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
const POINTS_PER_DECADE = 7; // Fixed baseline capacity (Minimum 7 GP)

const INITIAL_STATE: Indicators = {
  temperature: 1.6,
  ice: 70,
  food: 80,
  rain: 85,
  trust: 70,
  knowledge: 15,
  aerosolBurden: 0,
  infrastructure: 90,
};

const targetMeta: Record<TargetChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No SAI / pause', cost: 0, short: 'Avoids aerosol side effects, but background warming continues.' },
  moderate: { label: 'Stabilize near 1.5°C', cost: 1, short: 'Balanced climate control with moderate side effects.' },
  aggressive: { label: 'Aggressive cooling near 1.0°C', cost: 2, short: 'Reduces heat stress, but raises hydrological and agricultural side-effect pressure.' },
  emergency: { label: 'Emergency cooling near 0.8°C', cost: 3, short: 'Crisis intervention with high overcooling and rainfall disruption.' },
};

const particleMeta: Record<ParticleChoice, { label: string; short: string; cost: number; known: string; uncertainty: string }> = {
  sulfate: {
    label: 'Sulfate particles',
    short: 'Known baseline',
    cost: 1,
    known: 'Known cooling, known lifetime, known uncertainties',
    uncertainty: 'Most studied material, but linked to stratospheric heating and ozone concerns.',
  },
  caco3: {
    label: 'CaCO₃ / calcite particles',
    short: 'Partly known solid alternative',
    cost: 1,
    known: 'Partly known cooling, partly known lifetime',
    uncertainty: 'Potentially useful alternative; chemistry and ageing remain partly uncertain.',
  },
  alumina: {
    label: 'Alumina particles',
    short: 'High-performance particle',
    cost: 2,
    known: 'Promising optical behaviour',
    uncertainty: 'Can reduce sulfate limitations, but chlorine surface chemistry needs research.',
  },
  future: {
    label: 'Future engineered particle',
    short: 'Advanced material',
    cost: 2,
    known: 'High efficiency',
    uncertainty: 'Requires high knowledge to deploy safely without trust or rain penalties.',
  },
};

const seasonMeta: Record<SeasonChoice, { label: string; cost: number; short: string }> = {
  annual: { label: 'Annual injection', cost: 0, short: 'Reference strategy; predictable baseline.' },
  spring: { label: 'Spring injection', cost: 1, short: 'Efficient seasonal cooling.' },
  autumn: { label: 'Autumn injection', cost: 1, short: 'Better ice and monsoon rainfall trade-off.' },
};

const locationMeta: Record<LocationChoice, { label: string; cost: number; short: string }> = {
  tropical: { label: 'Tropical / equatorial injection', cost: 0, short: 'Global aerosol distribution.' },
  subtropical: { label: 'Subtropical injection', cost: 1, short: 'Middle strategy between global control and polar targeting.' },
  polar: { label: 'Polar injection', cost: 1, short: 'Strong ice protection with targeted polar cooling.' },
};

const researchMeta: Record<ResearchChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No support action', cost: 0, short: 'Saves points, but leaves vulnerability unaddressed.' },
  lab: { label: 'Laboratory particle testing', cost: 2, short: 'Raises scientific knowledge (+15%) and unlocks particle insights.' },
  monitoring: { label: 'Monitoring and open data', cost: 2, short: 'Raises trust (+10%), lowers event likelihood, and improves infrastructure.' },
  adaptation: { label: 'Adaptation and compensation', cost: 2, short: 'Protects food (+10%), rain (+6%), and trust (+12%) in vulnerable regions.' },
};

const sourceThemes = [
  {
    title: 'Visioni et al. (2020) — seasonally modulated SAI',
    detail: 'Basis for Level 2. Seasonal injection can reach similar global objectives while changing regional outcomes such as India precipitation, Amazon dry-season rainfall and Arctic sea ice.',
  },
  {
    title: 'Cohen et al. (2025) — regional SAI case study',
    detail: 'Basis for heat, food and regional-impact indicators. SAI can reduce heat extremes and improve some wet-season precipitation, soil moisture and crop outcomes compared with climate change.',
  },
  {
    title: 'Duffey et al. (2023) — polar geoengineering review',
    detail: 'Basis for Level 3. Polar SAI can target ice but is not purely local and can create lower-latitude rainfall problems.',
  },
  {
    title: 'Vattioni et al. (2025) — solid alumina/calcite particles',
    detail: 'Basis for Level 4. Solid particles may avoid some sulfate limitations, but the authors emphasize large microphysical and chemical uncertainty.',
  },
  {
    title: 'Vattioni et al. (2023) — alumina and ozone uncertainty',
    detail: 'Basis for alumina uncertainty. Alumina surface chemistry is poorly constrained and modeled ozone impacts depend strongly on uncertain reaction assumptions.',
  },
  {
    title: 'Proctor et al. (2018) — agriculture and volcanic aerosols',
    detail: 'Basis for the food/sunlight penalty. Stratospheric aerosols can cool the surface, but reduced direct sunlight can negatively affect crop yields.',
  },
  {
    title: 'Simpson et al. (2019) — hydroclimate and stratospheric heating',
    detail: 'Basis for aerosol-burden and rainfall penalties. Sulfate aerosols can heat the stratosphere and affect circulation and hydrology.',
  },
  {
    title: 'Haywood et al. (2013) — asymmetric forcing and Sahel rainfall',
    detail: 'Basis for regional inequality events. Hemispherically asymmetric aerosol loading can create strong rainfall differences, including Sahel drought pressure.',
  },
  {
    title: 'Parker & Irvine (2018) — termination shock',
    detail: 'Basis for the interruption rule. Sudden termination after SAI can cause very rapid warming, giving natural and human systems less time to adapt.',
  },
  {
    title: 'Tracy et al. (2022) and Fu et al. (2025) — health/ecosystems and drought inequality',
    detail: 'Basis for uncertainty events and trust loss. SAI may affect public health, ecosystems, water, agriculture and unequal drought exposure.',
  },
];

const researchNeeded = {
  laboratory: ['aerosol generator', 'particle synthesis reactor', 'particle sizing (SMPS)', 'coagulation chamber'],
  measurements: ['particle size distribution', 'optical scattering', 'settling velocity', 'surface chemistry'],
  models: ['atmospheric transport model', 'microphysics model', 'climate model', 'crop yield impact model'],
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
  if (target !== 'none') {
    cost += particleMeta[particle].cost;
    cost += seasonMeta[season].cost;
    cost += locationMeta[location].cost;
  }
  cost += researchMeta[research].cost;
  return cost;
}

function applyBurdenPressure(next: Indicators): string[] {
  const notes: string[] = [];
  if (next.aerosolBurden > 55) {
    next.rain -= 2;
    next.food -= 1;
    notes.push('Aerosol burden exceeded 55%: mild hydrological pressure applied.');
  }
  if (next.aerosolBurden > 75) {
    next.rain -= 3;
    next.food -= 2;
    next.trust -= 2;
    next.infrastructure -= 2;
    notes.push('Aerosol burden exceeded 75%: elevated side-effect pressure zone.');
  }
  return notes;
}

function calcEventChance(
  target: TargetChoice,
  particle: ParticleChoice,
  location: LocationChoice,
  research: ResearchChoice,
  indicators: Indicators,
): number {
  let chance = 0.04;
  chance += particle === 'future' ? 0.06 : particle === 'alumina' ? 0.04 : 0.01;
  chance += target === 'emergency' ? 0.06 : target === 'aggressive' ? 0.03 : 0;
  chance += indicators.aerosolBurden / 800;
  chance -= research === 'monitoring' ? 0.06 : 0;
  chance -= research === 'lab' ? 0.02 : 0;
  return Math.max(0.01, Math.min(0.25, chance));
}

function earthStatus(indicators: Indicators): { label: string; detail: string; emoji: string } {
  if (indicators.trust <= 0 || indicators.rain <= 0 || indicators.food <= 0 || indicators.infrastructure <= 0 || indicators.ice <= 0) {
    return {
      label: 'Critical Failure State',
      detail: 'At least one vital planetary attribute collapsed to 0%.',
      emoji: '💥',
    };
  }
  if (indicators.temperature >= 2.5) {
    return {
      label: 'Extreme Heat Earth',
      detail: 'Unmitigated global warming dominates ecosystems.',
      emoji: '🔥',
    };
  }
  if (indicators.temperature <= 0.9) {
    return {
      label: 'Overcooled Earth',
      detail: 'Aggressive cooling dampens hydrological cycles.',
      emoji: '❄️',
    };
  }
  if (indicators.aerosolBurden > 65) {
    return {
      label: 'Strained Managed Earth',
      detail: 'Temperature is controlled, but cumulative aerosol burden is elevated.',
      emoji: '🌫️',
    };
  }
  return {
    label: 'Managed Earth System',
    detail: 'Temperature targets are maintained with stable regional trade-offs.',
    emoji: '🌍',
  };
}

function differenceText(key: keyof Indicators, current: number, previous: number): { text: string; className: string } {
  const diff = Number((current - previous).toFixed(key === 'temperature' ? 2 : 0));
  if (diff === 0) return { text: '±0', className: 'text-slate-400' };
  if (key === 'temperature') {
    return { text: `${diff > 0 ? '+' : ''}${diff.toFixed(2)}°C`, className: diff > 0 ? 'text-red-400' : 'text-cyan-400' };
  }
  if (key === 'aerosolBurden') {
    return { text: `${diff > 0 ? '+' : ''}${diff}%`, className: diff > 0 ? 'text-red-400' : 'text-emerald-400' };
  }
  return { text: `${diff > 0 ? '+' : ''}${diff}%`, className: diff > 0 ? 'text-emerald-400' : 'text-red-400' };
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">{children}</div>;
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-950/60 px-3 py-1 text-sm text-blue-200">
                <Globe2 size={16} /> Interactive SAI governance game
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">The SAI Governance Challenge</h1>
              <p className="mt-4 max-w-3xl text-slate-300 md:text-lg">
                You are the climate council from 2030 to 2130. Manage global temperature, monsoon rainfall, food security, public trust, and scientific knowledge. You have a stable budget of 7 Governance Points each decade.
              </p>
            </div>
            <button
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500"
            >
              Start game <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-blue-400" /> Theory behind the game</h2>
            <p className="text-slate-300 leading-relaxed">
              Stratospheric aerosol injection (SAI) scatters incoming sunlight to reduce surface warming. It lowers average temperatures, but requires careful governance of regional trade-offs.
            </p>
          </InfoCard>

          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><Scale className="text-amber-400" /> Game Rules</h2>
            <p className="text-slate-300 leading-relaxed">
              Survive 10 decades until 2130. You receive **7 GP** each decade. **If any attribute drops to 0%, the game immediately ends.** Use support actions like Monitoring and Adaptation to preserve public trust and food security!
            </p>
          </InfoCard>
        </div>

        <InfoCard>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-emerald-400" /> Research Foundations</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {sourceThemes.map((source) => (
              <div key={source.title} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="font-bold text-white">{source.title}</div>
                <div className="mt-1 text-sm text-slate-400">{source.detail}</div>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, tone, note }: { icon: React.ReactNode; title: string; value: string; tone: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center shadow-xl">
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 ${tone}`}>{icon}</div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-1 font-mono text-2xl font-black text-white">{value}</div>
      {note && <div className="mt-1 text-[10px] text-slate-500">{note}</div>}
    </div>
  );
}

function ChoiceCard({
  selected,
  disabled,
  title,
  subtitle,
  cost,
  onClick,
  tone = 'blue',
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  subtitle: string;
  cost: number;
  onClick: () => void;
  tone?: 'blue' | 'emerald' | 'red' | 'purple' | 'amber';
}) {
  const selectedClass = {
    blue: 'border-blue-500 bg-blue-950/40',
    emerald: 'border-emerald-500 bg-emerald-950/40',
    red: 'border-red-500 bg-red-950/40',
    purple: 'border-purple-500 bg-purple-950/40',
    amber: 'border-amber-500 bg-amber-950/40',
  }[tone];
  const titleClass = {
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    purple: 'text-purple-300',
    amber: 'text-amber-300',
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${selected ? selectedClass : 'border-slate-700 bg-slate-800 hover:border-slate-500'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`font-bold ${titleClass}`}>{title}</div>
          <div className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-400">{subtitle}</div>
        </div>
        <div className="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">
          {cost} GP
        </div>
      </div>
    </button>
  );
}

function DynamicEarthCanvas({ indicators, target, particle }: { indicators: Indicators; target: TargetChoice; particle: ParticleChoice }) {
  const status = earthStatus(indicators);
  const burdenPercent = indicators.aerosolBurden;
  const rainPercent = indicators.rain;
  const foodPercent = indicators.food;
  const tempAnomaly = indicators.temperature;

  const solarIrradiance = Math.max(30, Math.round(100 - burdenPercent * 0.3 - (target === 'aggressive' ? 6 : target === 'emergency' ? 12 : 0)));

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
          {rainPercent < 30 ? (
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
            <div className="text-[11px] text-slate-400">Impacted by atmospheric dimming and precipitation patterns.</div>
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

function ResearchInsightTracker({ knowledge, futureUnlocked }: { knowledge: number; futureUnlocked: boolean }) {
  const items = [
    {
      threshold: 25,
      title: '25% Knowledge: Target & Material Insights',
      text: 'Detailed numerical breakdowns revealed for temperature targets and materials.',
    },
    {
      threshold: 50,
      title: '50% Knowledge: Spatial & Seasonal Insights',
      text: 'Reveals regional monsoon and polar ice dynamics for seasonal & spatial choices.',
    },
    {
      threshold: 70,
      title: '70% Knowledge: Solid Particle Mastery',
      text: 'Reduces uncertainty risks when choosing CaCO₃ and Alumina particles.',
    },
    {
      threshold: 80,
      title: '80% Knowledge: Future Particle Access',
      text: futureUnlocked
        ? 'Future engineered particles are unlocked for high-efficiency cooling.'
        : 'Future engineered particles unlocked once year >= 2090.',
    },
  ];

  return (
    <InfoCard>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><Brain className="text-purple-400" /> Scientific Knowledge Tracker</h2>
      <div className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-sm text-purple-100">
        Scientific Knowledge: <b>{knowledge}%</b>. Perform Laboratory Testing to raise knowledge and unlock insights.
      </div>
      <div className="space-y-3 text-sm">
        {items.map((item) => {
          const unlocked = knowledge >= item.threshold;
          return (
            <div key={item.title} className={`rounded-xl border p-3 ${unlocked ? 'border-purple-500/40 bg-slate-950/60 text-slate-200' : 'border-slate-800 bg-slate-950/30 text-slate-500'}`}>
              <div className="flex items-center justify-between gap-3">
                <b className={unlocked ? 'text-white' : 'text-slate-500'}>{item.title}</b>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs">{item.threshold}%</span>
              </div>
              <div className="mt-2">{unlocked ? item.text : 'Locked: perform Laboratory Testing to reach this threshold.'}</div>
            </div>
          );
        })}
      </div>
    </InfoCard>
  );
}

export function App() {
  const [introOpen, setIntroOpen] = useState(true);
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
  const [strategyLog, setStrategyLog] = useState<StrategyEntry[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [terminationShock, setTerminationShock] = useState(false);
  const [attributeCollapseReason, setAttributeCollapseReason] = useState<string | null>(null);

  const futureUnlocked = indicators.knowledge >= 80 && year >= 2090;
  const emergencyUnlocked = year >= 2070 || indicators.temperature >= 2.3;

  const currentCost = computeCost(target, particle, season, location, research);
  const pointsRemaining = POINTS_PER_DECADE - currentCost;

  const processDecade = () => {
    if (currentCost > POINTS_PER_DECADE) return;

    const previousTarget = strategyLog[strategyLog.length - 1]?.target ?? 'none';
    const activeSAIDecades = strategyLog.filter((e) => e.target !== 'none').length;

    // Check for Termination Shock (Parker & Irvine 2018)
    if (target === 'none' && previousTarget !== 'none' && activeSAIDecades >= 2) {
      setTerminationShock(true);
      setGameOver(true);
      return;
    }

    if (particle === 'future' && !futureUnlocked) return;
    if (target === 'emergency' && !emergencyUnlocked) return;

    const nextYear = year + 10;
    const withoutSAI = baselineTemperature(nextYear);
    const previous = indicators;
    let next: Indicators = { ...indicators };
    let event = '';
    let reportTitle = 'Decade Completed';
    let reportText = 'The climate system responded to your choices with balanced regional impacts.';
    const burdenNotes: string[] = [];

    if (target === 'none') {
      next.temperature = withoutSAI;
      next.ice -= 6;
      next.food -= 4;
      next.rain -= 3;
      next.trust += 2;
      next.aerosolBurden -= 15;
      next.infrastructure += 2;
      reportText = 'No SAI deployed this decade. Direct side effects avoided, but baseline warming increased.';
    } else {
      let desiredTemp = targetTemperature(target, withoutSAI);
      next.temperature = Math.max(0.4, desiredTemp);

      if (target === 'moderate') {
        next.food -= 1;
        next.rain -= 2;
        next.trust += 2; // Moderate cooling stabilizes climate and maintains trust
        next.aerosolBurden += 5;
      }
      if (target === 'aggressive') {
        next.food -= 3;
        next.rain -= 4;
        next.trust -= 1;
        next.aerosolBurden += 10;
      }
      if (target === 'emergency') {
        next.food -= 5;
        next.rain -= 8;
        next.trust -= 3;
        next.aerosolBurden += 15;
      }

      if (particle === 'sulfate') {
        next.rain -= 1;
        next.aerosolBurden += 3;
      }
      if (particle === 'caco3') {
        next.food += 2;
        next.aerosolBurden += 3;
      }
      if (particle === 'alumina') {
        next.knowledge += 2;
        next.aerosolBurden += 3;
      }
      if (particle === 'future') {
        next.knowledge += 3;
        next.food += 5;
        next.rain += 2;
        next.aerosolBurden += 2;
      }

      if (season === 'annual') next.ice += 2;
      if (season === 'spring') { next.ice += 1; next.rain -= 2; }
      if (season === 'autumn') { next.ice += 8; next.rain += 2; } // Visioni et al. 2020

      if (location === 'tropical') next.rain += 1;
      if (location === 'subtropical') { next.ice += 3; next.rain -= 1; }
      if (location === 'polar') { next.ice += 12; next.rain -= 6; next.food -= 3; } // Duffey et al. 2023
    }

    // Support Actions (Guaranteed Positive Impacts)
    if (research === 'lab') {
      next.knowledge += 15;
      next.trust += 3;
      next.infrastructure += 2;
    }
    if (research === 'monitoring') {
      next.knowledge += 5;
      next.trust += 10; // Clear pro-trust reward
      next.infrastructure += 8;
    }
    if (research === 'adaptation') {
      next.trust += 12; // Clear pro-trust reward
      next.food += 10;
      next.rain += 6;
    }

    burdenNotes.push(...applyBurdenPressure(next));

    let eventChance = calcEventChance(target, particle, location, research, next);
    if (Math.random() < eventChance) {
      next.rain -= 5;
      next.food -= 4;
      next.trust -= 3;
      event = 'Regional Hydroclimate Anomaly: rainfall fluctuations affected crop production and regional trust.';
      reportTitle = 'Event: Hydroclimate Variance';
    }

    const rounded = roundIndicators(next);

    // CHECK FOR 0% ATTRIBUTE COLLAPSE
    if (rounded.ice <= 0 || rounded.food <= 0 || rounded.rain <= 0 || rounded.trust <= 0 || rounded.infrastructure <= 0) {
      let failedAttr = '';
      if (rounded.ice <= 0) failedAttr = 'Arctic Sea Ice';
      if (rounded.food <= 0) failedAttr = 'Food Security';
      if (rounded.rain <= 0) failedAttr = 'Rainfall / Monsoon Stability';
      if (rounded.trust <= 0) failedAttr = 'Public Trust';
      if (rounded.infrastructure <= 0) failedAttr = 'Operational Infrastructure';

      setAttributeCollapseReason(failedAttr);
      setGameOver(true);
      return;
    }

    const entry: StrategyEntry = { year, particle, target, season, location, research, cost: currentCost, event };

    setIndicators(rounded);
    setHistory((prev) => [...prev, { year: nextYear, ...rounded, withoutSAI }]);
    setStrategyLog((prev) => [...prev, entry]);
    setYear(nextYear);
    setReport({ year: nextYear, title: reportTitle, text: reportText, event, previous, current: rounded, cost: currentCost, choices: entry });
  };

  const closeReport = () => {
    setReport(null);
    if (year >= END_YEAR) setGameOver(true);
  };

  const resetGame = () => {
    setIntroOpen(true);
    setYear(START_YEAR);
    setIndicators(INITIAL_STATE);
    setHistory([{ year: START_YEAR, ...INITIAL_STATE, withoutSAI: INITIAL_STATE.temperature }]);
    setTarget('moderate');
    setParticle('sulfate');
    setSeason('annual');
    setLocation('tropical');
    setResearch('none');
    setStrategyLog([]);
    setReport(null);
    setGameOver(false);
    setTerminationShock(false);
    setAttributeCollapseReason(null);
  };

  if (introOpen) return <IntroScreen onStart={() => setIntroOpen(false)} />;

  if (terminationShock) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200 flex items-center justify-center font-sans">
        <div className="max-w-3xl rounded-3xl border border-red-800 bg-red-950/30 p-8 text-center shadow-2xl shadow-red-950/40">
          <AlertOctagon className="mx-auto mb-5 text-red-400" size={88} />
          <h1 className="text-5xl font-black text-white">Termination Shock</h1>
          <p className="mt-5 text-left text-lg leading-relaxed text-slate-300">
            The SAI program was abruptly interrupted. Unmasked greenhouse warming occurred rapidly, triggering catastrophic system collapse (Parker & Irvine 2018).
          </p>
          <button onClick={resetGame} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-6 py-4 font-bold text-white hover:bg-red-600">
            <RefreshCcw size={18} /> Restart Game
          </button>
        </div>
      </div>
    );
  }

  if (gameOver && attributeCollapseReason) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200 flex items-center justify-center font-sans">
        <div className="max-w-3xl rounded-3xl border border-red-800 bg-red-950/30 p-8 text-center shadow-2xl">
          <AlertTriangle className="mx-auto mb-5 text-red-500" size={88} />
          <h1 className="text-5xl font-black text-white">System Collapse</h1>
          <p className="mt-4 text-2xl font-bold text-red-400">{attributeCollapseReason} reached 0%</p>
          <p className="mt-4 text-slate-300">
            A core planetary or human resilience metric dropped to zero, breaking system stability. Use Monitoring or Compensation & Adaptation actions to keep Trust, Food, and Rainfall well above danger levels.
          </p>
          <button onClick={resetGame} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-500">
            <RefreshCcw size={18} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const metricCards = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
      <MetricCard icon={<ThermometerSnowflake size={22} />} title="Temp." value={`+${indicators.temperature.toFixed(2)}°C`} tone={indicators.temperature > 2 ? 'text-red-400' : 'text-cyan-400'} />
      <MetricCard icon={<Snowflake size={22} />} title="Ice" value={`${indicators.ice}%`} tone={indicators.ice < 20 ? 'text-red-400 font-bold' : 'text-blue-400'} />
      <MetricCard icon={<Wheat size={22} />} title="Food" value={`${indicators.food}%`} tone={indicators.food < 20 ? 'text-red-400 font-bold' : 'text-amber-400'} />
      <MetricCard icon={<CloudRain size={22} />} title="Rain" value={`${indicators.rain}%`} tone={indicators.rain < 20 ? 'text-red-400 font-bold' : 'text-cyan-400'} />
      <MetricCard icon={<Scale size={22} />} title="Trust" value={`${indicators.trust}%`} tone={indicators.trust < 20 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
      <MetricCard icon={<Beaker size={22} />} title="Knowledge" value={`${indicators.knowledge}%`} tone={indicators.knowledge >= 50 ? 'text-purple-400 font-bold' : 'text-amber-400'} />
      <MetricCard icon={<Gauge size={22} />} title="Burden" value={`${indicators.aerosolBurden}%`} tone={indicators.aerosolBurden > 65 ? 'text-red-400' : 'text-slate-300'} note="lower is better" />
      <MetricCard icon={<Wrench size={22} />} title="Infrastructure" value={`${indicators.infrastructure}%`} tone={indicators.infrastructure < 20 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
    </div>
  );

  if (gameOver) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200 font-sans">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
            <h1 className="text-4xl font-black text-white">Century Completed: 2130</h1>
            <p className="mt-2 text-emerald-400 font-bold text-lg">Congratulations! You successfully governed SAI across ten decades without a planetary collapse.</p>
          </div>
          <DynamicEarthCanvas indicators={indicators} target={target} particle={particle} />
          {metricCards}
          <button onClick={resetGame} className="mx-auto flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-500"><RefreshCcw size={18} /> Play Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-200 font-sans">
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-white">{report.title}</h2>
                <p className="text-slate-400">Decade Ending {report.year}</p>
              </div>
              <button onClick={closeReport} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500">Continue</button>
            </div>
            <p className="mb-4 text-slate-300">{report.text}</p>
            {report.event && <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-amber-100"><b>Event Notice:</b> {report.event}</div>}
            <div className="grid gap-3 md:grid-cols-4">
              {([
                ['temperature', 'Temperature'],
                ['ice', 'Arctic Ice'],
                ['food', 'Food Security'],
                ['rain', 'Rainfall'],
                ['trust', 'Public Trust'],
                ['knowledge', 'Knowledge'],
                ['aerosolBurden', 'Aerosol Burden'],
                ['infrastructure', 'Infrastructure'],
              ] as [keyof Indicators, string][]).map(([key, label]) => {
                const diff = differenceText(key, report.current[key], report.previous[key]);
                const value = key === 'temperature' ? `+${report.current[key].toFixed(2)}°C` : `${report.current[key]}%`;
                return (
                  <div key={key} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-1 text-2xl font-black text-white">{value}</div>
                    <div className={`text-sm font-bold ${diff.className}`}>{diff.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">SAI Governance Challenge</h1>
            <p className="text-sm text-slate-400">Decade Planning: {year} to {year + 10}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><b>Governance Capacity:</b> {POINTS_PER_DECADE} GP</div>
            <div className={`rounded-xl border px-3 py-2 ${pointsRemaining < 0 ? 'border-red-700 bg-red-950/40 text-red-200' : 'border-slate-700 bg-slate-950'}`}><b>Cost:</b> {currentCost} GP · <b>Left:</b> {pointsRemaining} GP</div>
            <button onClick={resetGame} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 hover:border-slate-500"><RefreshCcw size={16} /></button>
          </div>
        </div>

        {/* Visual Atmospheric Canvas */}
        <DynamicEarthCanvas indicators={indicators} target={target} particle={particle} />
        
        {metricCards}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <InfoCard>
              <h2 className="mb-4 text-2xl font-black text-white">Decade Decisions</h2>
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><ThermometerSnowflake size={16} /> Level 1: Target Choice</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={target === 'none'} title="No SAI / pause" subtitle={targetMeta.none.short} cost={targetMeta.none.cost} tone="amber" onClick={() => setTarget('none')} />
                    <ChoiceCard selected={target === 'moderate'} title="Stabilize near 1.5°C" subtitle={targetMeta.moderate.short} cost={targetMeta.moderate.cost} tone="blue" onClick={() => setTarget('moderate')} />
                    <ChoiceCard selected={target === 'aggressive'} title="Aggressive cooling near 1.0°C" subtitle={targetMeta.aggressive.short} cost={targetMeta.aggressive.cost} tone="emerald" onClick={() => setTarget('aggressive')} />
                    <ChoiceCard selected={target === 'emergency'} disabled={!emergencyUnlocked} title="Emergency cooling near 0.8°C" subtitle={emergencyUnlocked ? targetMeta.emergency.short : 'Locked until 2070 or severe warming.'} cost={targetMeta.emergency.cost} tone="red" onClick={() => setTarget('emergency')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Activity size={16} /> Level 2: Seasonality</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={season === 'annual'} title="Annual injection" subtitle={seasonMeta.annual.short} cost={seasonMeta.annual.cost} onClick={() => setSeason('annual')} />
                    <ChoiceCard selected={season === 'spring'} title="Spring injection" subtitle={seasonMeta.spring.short} cost={seasonMeta.spring.cost} tone="amber" onClick={() => setSeason('spring')} />
                    <ChoiceCard selected={season === 'autumn'} title="Autumn injection" subtitle={seasonMeta.autumn.short} cost={seasonMeta.autumn.cost} tone="emerald" onClick={() => setSeason('autumn')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Globe2 size={16} /> Level 3: Injection Location</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={location === 'tropical'} title="Tropical / equatorial" subtitle={locationMeta.tropical.short} cost={locationMeta.tropical.cost} onClick={() => setLocation('tropical')} />
                    <ChoiceCard selected={location === 'subtropical'} title="Subtropical" subtitle={locationMeta.subtropical.short} cost={locationMeta.subtropical.cost} tone="blue" onClick={() => setLocation('subtropical')} />
                    <ChoiceCard selected={location === 'polar'} title="Polar" subtitle={locationMeta.polar.short} cost={locationMeta.polar.cost} tone="red" onClick={() => setLocation('polar')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Atom size={16} /> Level 4: Material Selection</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={particle === 'sulfate'} title="Sulfate particles" subtitle={particleMeta.sulfate.short} cost={particleMeta.sulfate.cost} tone="blue" onClick={() => setParticle('sulfate')} />
                    <ChoiceCard selected={particle === 'caco3'} title="CaCO₃ / calcite particles" subtitle={particleMeta.caco3.short} cost={particleMeta.caco3.cost} tone="purple" onClick={() => setParticle('caco3')} />
                    <ChoiceCard selected={particle === 'alumina'} title="Alumina particles" subtitle={particleMeta.alumina.short} cost={particleMeta.alumina.cost} tone="amber" onClick={() => setParticle('alumina')} />
                    <ChoiceCard selected={particle === 'future'} disabled={!futureUnlocked} title="Future engineered particle" subtitle={particleMeta.future.short} cost={particleMeta.future.cost} tone="red" onClick={() => setParticle('future')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Microscope size={16} /> Support Action</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={research === 'none'} title="No support action" subtitle={researchMeta.none.short} cost={researchMeta.none.cost} onClick={() => setResearch('none')} />
                    <ChoiceCard selected={research === 'lab'} title="Laboratory particle testing (+Knowledge)" subtitle={researchMeta.lab.short} cost={researchMeta.lab.cost} tone="purple" onClick={() => setResearch('lab')} />
                    <ChoiceCard selected={research === 'monitoring'} title="Monitoring and open data (+Trust & Infra)" subtitle={researchMeta.monitoring.short} cost={researchMeta.monitoring.cost} tone="emerald" onClick={() => setResearch('monitoring')} />
                    <ChoiceCard selected={research === 'adaptation'} title="Compensation and adaptation (+Food & Rain)" subtitle={researchMeta.adaptation.short} cost={researchMeta.adaptation.cost} tone="amber" onClick={() => setResearch('adaptation')} />
                  </div>
                </section>
              </div>

              {pointsRemaining < 0 && <div className="mt-5 rounded-2xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-200">Selected package exceeds your 7 Governance Points limit! Choose a lighter combination.</div>}

              <button onClick={processDecade} disabled={pointsRemaining < 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed">
                <Play size={18} /> Complete Decade
              </button>
            </InfoCard>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <ResearchInsightTracker knowledge={indicators.knowledge} futureUnlocked={futureUnlocked} />

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Temperature Trajectory</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} stroke="#64748b" />
                    <YAxis domain={[0, 4.2]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="3 3" label={{ value: '1.5°C', fill: '#10b981', fontSize: 10 }} />
                    <Line type="linear" dataKey="withoutSAI" name="Without SAI" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    <Line type="linear" dataKey="temperature" name="Actual Temp." stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Planetary & Human Resilience Metrics</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} label={{ value: 'COLLAPSE THRESHOLD (0%)', fill: '#ef4444', fontSize: 10 }} />
                    <Line type="linear" dataKey="ice" name="Arctic Ice" stroke="#38bdf8" strokeWidth={2} />
                    <Line type="linear" dataKey="food" name="Food Security" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="linear" dataKey="rain" name="Rainfall" stroke="#2dd4bf" strokeWidth={2} />
                    <Line type="linear" dataKey="trust" name="Public Trust" stroke="#a78bfa" strokeWidth={2} />
                    <Line type="linear" dataKey="knowledge" name="Knowledge" stroke="#e879f9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
