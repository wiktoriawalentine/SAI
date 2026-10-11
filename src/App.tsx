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
  eventType?: 'chemistry' | 'drought' | 'ecosystem' | 'none';
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
  trust: 70,
  knowledge: 10,
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
  lab: { label: 'Laboratory particle testing', cost: 2, short: 'Raises scientific knowledge (+8%) and unlocks particle insights.' },
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
    title: 'Parker & Irvine (2018) — termination shock',
    detail: 'Basis for the interruption rule. Sudden termination after SAI can cause very rapid warming, giving natural and human systems less time to adapt.',
  },
];

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
    knowledge: Math.round(clamp(next.knowledge, 0, 100)),
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
    notes.push('High aerosol burden >55% caused stratospheric heating and hydroclimate disruption.');
  }
  if (next.aerosolBurden > 75) {
    next.rain -= 4;
    next.food -= 3;
    next.trust -= 3;
    next.infrastructure -= 2;
    notes.push('Severe aerosol burden >75%: Hydrological cycle dampening and direct sunlight reductions penalized agricultural yields.');
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
  let chance = 0.08;
  chance += particle === 'future' ? 0.10 : particle === 'alumina' ? 0.06 : particle === 'caco3' ? 0.04 : 0.02;
  chance += target === 'emergency' ? 0.08 : target === 'aggressive' ? 0.04 : 0;
  chance += location === 'polar' ? 0.05 : 0;
  chance += indicators.aerosolBurden / 500;
  chance -= research === 'monitoring' ? 0.08 : 0;
  chance -= research === 'lab' ? 0.03 : 0;
  return Math.max(0.04, Math.min(0.40, chance));
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

function strategyExplanation(entry: StrategyEntry, knowledge: number): string[] {
  const notes: string[] = [];

  if (knowledge < 30) {
    notes.push('🔬 Basic Observation (<30% Knowledge): Primary temperature targets and basic support actions are monitored. Invest in research to reveal microphysical and hydroclimate mechanics.');
    if (entry.target === 'none') notes.push('No SAI deployed; greenhouse warming continues.');
    else notes.push(`Deployed ${targetMeta[entry.target].label} cooling.`);
    return notes;
  }

  notes.push('📊 Research insight: Temperature targets control global heat stress, but regional hydroclimate shifts depend heavily on injection geometry.');
  if (entry.target === 'none') {
    notes.push('No SAI avoids aerosol side effects, but unmitigated climate warming severely degrades Arctic ice and agricultural resilience.');
  } else if (entry.target === 'moderate') {
    notes.push('Moderate cooling near 1.5°C achieves a balanced trade-off between heat extreme reduction and hydrological perturbation.');
  } else if (entry.target === 'aggressive') {
    notes.push('Aggressive cooling reduces thermal stress, but decreased direct solar radiation can penalize photosynthetic crop yields.');
  } else {
    notes.push('Emergency cooling can strongly alter stratospheric heating and trigger significant precipitation deficits.');
  }

  if (entry.season === 'autumn') {
    notes.push('Autumn injection is treated as favourable for Arctic sea-ice preservation and for reducing some monsoon/rainfall trade-offs.');
  }
  if (entry.location === 'polar') {
    notes.push('Polar injection concentrates cooling over high latitudes, but can disrupt lower-latitude precipitation via circulation shifts.');
  }

  if (knowledge >= 60) {
    notes.push('🧪 Microphysics and chemistry insight: Material selection determines stratospheric chemistry and aerosol lifetime.');
    if (entry.particle === 'sulfate') {
      notes.push('Sulfate aerosols can heat the lower stratosphere and contribute to ozone-chemistry concerns.');
    } else if (entry.particle === 'caco3') {
      notes.push('Calcite particles are treated as a partly known solid alternative that may reduce some sulfate-related limitations, but still requires research.');
    } else if (entry.particle === 'alumina') {
      notes.push('Solid alumina particles are treated as high-performance but chemically uncertain, especially for surface-reaction and ozone pathways.');
    } else if (entry.particle === 'future') {
      notes.push('Engineered nanoparticles optimize optical scattering efficiency while minimizing microphysical coagulation and burden penalties.');
    }
  }

  if (knowledge >= 90) {
    notes.push('⚡ Scientific Mastery (100% Precision): Full theoretical understanding of radiative forcing, stratospheric ozone feedback, and regional hydrological responses achieved!');
  }

  if (entry.research === 'lab') {
    notes.push('Laboratory testing generated scientific knowledge, unlocking chemical and physical aerosol models.');
  } else if (entry.research === 'monitoring') {
    notes.push('Monitoring and open data boosted public trust (+10% Trust) and system infrastructure resilience.');
  } else if (entry.research === 'adaptation') {
    notes.push('Adaptation funding shielded vulnerable regional agriculture and water distribution systems.');
  }

  return notes;
}

function lockedEffectText(threshold: number, basic: string, exact: string, knowledge: number): string {
  if (knowledge >= threshold) return exact;
  return `${basic}\nExact effect hidden until ${threshold}% knowledge.`;
}

function targetSubtitle(choice: TargetChoice, knowledge: number): string {
  const basic: Record<TargetChoice, string> = {
    none: 'No aerosol side effects, but baseline warming continues.',
    moderate: 'Balanced intervention near 1.5°C. Low side effects.',
    aggressive: 'Reduces heat stress, but dimming can reduce crop photosynthesis.',
    emergency: 'Extreme action. Rapid temperature drop with high monsoon-disruption risk.',
  };
  const exact: Record<TargetChoice, string> = {
    none: 'Temp follows warming; ice -6; food -4; rain -3; trust +2; burden -15; infrastructure +2.',
    moderate: 'Temp → +1.5°C; food -1; rain -2; trust +2; burden +5.',
    aggressive: 'Temp → +1.0°C; food -3 (photons penalty); rain -4; trust -1; burden +10.',
    emergency: 'Temp → +0.8°C; food -5; rain -8; trust -3; burden +15.',
  };
  return lockedEffectText(25, basic[choice], exact[choice], knowledge);
}

function seasonSubtitle(choice: SeasonChoice, knowledge: number, paused: boolean): string {
  if (paused) return 'No injection this decade.';
  const basic: Record<SeasonChoice, string> = {
    annual: 'Reference strategy. Continuous baseline injection.',
    spring: 'Efficient seasonal cooling for Northern Hemisphere summer.',
    autumn: 'Improves Arctic sea ice and selected monsoon/rainfall trade-offs.',
  };
  const exact: Record<SeasonChoice, string> = {
    annual: 'Ice +2; burden +1.',
    spring: 'Ice +1; rain -2.',
    autumn: 'Ice +8; rain +2.',
  };
  return lockedEffectText(40, basic[choice], exact[choice], knowledge);
}

function locationSubtitle(choice: LocationChoice, knowledge: number, paused: boolean): string {
  if (paused) return 'No injection this decade.';
  const basic: Record<LocationChoice, string> = {
    tropical: 'Equatorial injection. Global aerosol spread with balanced forcing.',
    subtropical: 'Intermediate strategy balancing global and polar cooling.',
    polar: 'Strong high-latitude ice rescue, but can shift lower-latitude rainfall.',
  };
  const exact: Record<LocationChoice, string> = {
    tropical: 'Rain +1.',
    subtropical: 'Ice +3; rain -1.',
    polar: 'Ice +12; rain -6; food -3.',
  };
  return lockedEffectText(55, basic[choice], exact[choice], knowledge);
}

function materialSubtitle(choice: ParticleChoice, knowledge: number, paused: boolean, futureUnlocked: boolean): string {
  if (paused) return 'No injection this decade.';
  if (choice === 'future' && !futureUnlocked) return 'Locked: needs ≥80% knowledge and year ≥2090.';
  const basic: Record<ParticleChoice, string> = {
    sulfate: 'Baseline material. Known cooling, but linked to stratospheric heating concerns.',
    caco3: 'Solid calcite. Partly known alternative with chemistry and ageing uncertainty.',
    alumina: 'High scattering performance, but surface chemistry remains uncertain.',
    future: 'Advanced engineered particle. Maximum efficiency with minimal aerosol burden.',
  };
  const caco3Trust = knowledge < 60 ? 'trust -2' : 'no trust penalty';
  const aluminaTrust = knowledge < 60 ? 'trust -3' : 'trust -1';

  const exact: Record<ParticleChoice, string> = {
    sulfate: 'Rain -1; burden +3.',
    caco3: `Knowledge +1; food +1; ${caco3Trust}; burden +3.`,
    alumina: `Knowledge +2; rain -1; ${aluminaTrust}; burden +3.`,
    future: 'Knowledge +3; food +5; rain +2; burden +2.',
  };
  return lockedEffectText(70, basic[choice], exact[choice], knowledge);
}

function supportSubtitle(choice: ResearchChoice, knowledge: number): string {
  const basic: Record<ResearchChoice, string> = {
    none: 'Save points, but leaves systems vulnerable to uncertainty.',
    lab: 'Perform particle microphysics & chemistry research.',
    monitoring: 'Improve observations, public trust and infrastructure resilience.',
    adaptation: 'Fund regional adaptation & agricultural compensation.',
  };
  const exact: Record<ResearchChoice, string> = {
    none: 'No direct effect. Saves capacity this decade.',
    lab: 'Knowledge +8; trust +3; infrastructure +2.',
    monitoring: 'Knowledge +3; trust +10; infrastructure +8.',
    adaptation: 'Trust +12; food +10; rain +6.',
  };
  return lockedEffectText(25, basic[choice], exact[choice], knowledge);
}

function visualTier(value: number): { label: string; chip: string; bar: string; text: string } {
  if (value <= 0) return { label: 'Collapsed', chip: 'bg-red-950 text-red-200 border-red-700', bar: 'bg-red-500', text: 'text-red-300' };
  if (value < 25) return { label: 'Critical', chip: 'bg-red-950/80 text-red-200 border-red-700', bar: 'bg-red-500', text: 'text-red-300' };
  if (value < 45) return { label: 'Severe stress', chip: 'bg-orange-950/80 text-orange-200 border-orange-700', bar: 'bg-orange-500', text: 'text-orange-300' };
  if (value < 70) return { label: 'Stressed', chip: 'bg-amber-950/80 text-amber-200 border-amber-700', bar: 'bg-amber-400', text: 'text-amber-300' };
  return { label: 'Stable', chip: 'bg-emerald-950/80 text-emerald-200 border-emerald-700', bar: 'bg-emerald-400', text: 'text-emerald-300' };
}

function EarthSunVisualizer({ indicators, target }: { indicators: Indicators; target: TargetChoice }) {
  const temperature = indicators.temperature;
  const ice = indicators.ice;
  const aerosolBurden = indicators.aerosolBurden;
  const solarIrradiance = Math.max(30, Math.round(100 - aerosolBurden * 0.3 - (target === 'aggressive' ? 6 : target === 'emergency' ? 12 : 0)));

  const earthGradient = useMemo(() => {
    if (indicators.ice <= 0 || indicators.food <= 0 || indicators.rain <= 0 || indicators.trust <= 0) return 'radial-gradient(circle at 35% 35%, #fca5a5, #dc2626, #450a0a)';
    if (temperature >= 2.5) return 'radial-gradient(circle at 35% 35%, #fed7aa, #f97316, #7c2d12)';
    if (temperature >= 1.8) return 'radial-gradient(circle at 35% 35%, #fde68a, #f59e0b, #78350f)';
    if (temperature <= 0.9) return 'radial-gradient(circle at 35% 35%, #bae6fd, #38bdf8, #0c4a6e)';
    return 'radial-gradient(circle at 35% 35%, #7dd3fc, #2563eb, #1e3a8a)';
  }, [temperature, indicators.ice, indicators.food, indicators.rain, indicators.trust]);

  const iceCapHeight = Math.max(2, Math.round(4 + ice * 0.18));
  const aerosolOpacity = Math.min(0.85, aerosolBurden / 100);
  const sunlightOpacity = Math.max(0.15, solarIrradiance / 100);
  const sunScale = Math.max(0.68, solarIrradiance / 100);
  const hazeLines = Math.min(10, Math.max(0, Math.round(aerosolBurden / 10)));

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
      <div className="absolute inset-0 opacity-35 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-center">
        <div
          className="rounded-full bg-gradient-to-br from-amber-100 via-amber-400 to-yellow-600 shadow-[0_0_55px_rgba(251,191,36,0.65)] transition-all duration-700"
          style={{ width: 92 * sunScale, height: 92 * sunScale, opacity: sunlightOpacity }}
        />
        <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-200">Sun</div>
        <div className="mt-1 text-[10px] text-slate-400">{solarIrradiance}% light</div>
      </div>

      <div className="absolute left-32 right-32 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-amber-300/15">
        <div className="h-full rounded-full bg-amber-300 transition-all duration-700" style={{ width: `${solarIrradiance}%`, opacity: sunlightOpacity }} />
      </div>

      <div className="absolute inset-y-10 left-1/3 right-1/3 flex justify-center gap-2 pointer-events-none">
        {[...Array(hazeLines)].map((_, i) => (
          <div
            key={i}
            className="h-full w-1 rounded-full bg-amber-200/30 blur-[1px]"
            style={{ opacity: aerosolOpacity * 0.75, transform: `translateX(${(i - hazeLines / 2) * 10}px) rotate(-8deg)` }}
          />
        ))}
      </div>

      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          {aerosolBurden > 0 && (
            <div
              className="absolute rounded-full border-4 border-amber-300/60 bg-amber-300/10 blur-[1px] transition-all duration-700"
              style={{ inset: `${Math.max(-22, -8 - aerosolBurden / 4)}px`, opacity: aerosolOpacity }}
            />
          )}
          <div className="relative h-32 w-32 overflow-hidden rounded-full shadow-2xl ring-2 ring-slate-700 transition-all duration-700" style={{ background: earthGradient }}>
            <div className="absolute left-5 top-7 h-8 w-12 rounded-full bg-emerald-400/35 blur-[1px]" />
            <div className="absolute right-6 top-12 h-10 w-8 rounded-full bg-emerald-300/30 blur-[1px]" />
            {ice > 0 && (
              <>
                <div className="absolute inset-x-3 top-0 rounded-b-full bg-slate-100 transition-all duration-700" style={{ height: iceCapHeight, opacity: Math.max(0.18, ice / 100) }} />
                <div className="absolute inset-x-4 bottom-0 rounded-t-full bg-slate-100 transition-all duration-700" style={{ height: Math.max(2, iceCapHeight - 2), opacity: Math.max(0.16, ice / 100) }} />
              </>
            )}
            {temperature >= 2.5 && <div className="absolute inset-0 bg-red-500/20 animate-pulse" />}
            {temperature <= 0.9 && <div className="absolute inset-0 bg-cyan-100/15" />}
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Earth</div>
        <div className="mt-1 text-[10px] text-slate-400">Ice {ice}% · Burden {aerosolBurden}%</div>
      </div>
    </div>
  );
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
                <Globe2 size={16} /> Research-Backed SAI Governance Challenge
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">The SAI Governance Challenge</h1>
              <p className="mt-4 max-w-3xl text-slate-300 md:text-lg">
                You are the global climate council from 2030 to 2130. Balance temperature cooling against monsoon disruptions, direct sunlight reductions on agriculture, and public trust.
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
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-blue-400" /> Research-Grounded Mechanics</h2>
            <p className="text-slate-300 leading-relaxed">
              Game options illustrate research-supported climate mechanisms and trade-offs, from Visioni et al. (seasonal injection) to Proctor et al. (agricultural sunlight effects) and Parker & Irvine (termination shock). Numerical scores and event probabilities are educational assumptions.
            </p>
          </InfoCard>

          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><Scale className="text-amber-400" /> Game rules overview</h2>
            <p className="text-slate-300 leading-relaxed">
              Your task is to govern SAI from 2030 to 2130. Each decade gives you 7 Governance Points, and every selected action uses part of this limited capacity. You choose one option in each level, add an optional support action, complete the decade, and then read the result report.
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
          <div className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-100">
            <b>Scientific disclaimer:</b> This game translates published research trends into simplified scoring rules. The directions of the effects are research-based, but the exact point values and event probabilities are not climate-model outputs. The game is an educational governance simulation, not a predictive climate model.
          </div>
        </InfoCard>

        <InfoCard>
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><Scale className="text-amber-400" /> Game rules: how to play</h2>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <b className="text-white">1. Play decade by decade</b>
              <p className="mt-1">The game starts in 2030 and advances in ten-year steps until 2130. After each decade, a report explains how the selected choices changed the indicators.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <b className="text-white">2. Spend Governance Points</b>
              <p className="mt-1">Each decade gives you 7 GP. Every target, material, location, season and support action has a cost. If the selected package costs more than 7 GP, the decade cannot be completed.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <b className="text-white">3. Choose one option in each level</b>
              <p className="mt-1">Level 1 sets the temperature target, Level 2 sets the injection season, Level 3 sets the injection location, and Level 4 selects the aerosol material.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <b className="text-white">4. Add one support action</b>
              <p className="mt-1">Support actions use GP but can improve scientific knowledge, monitoring capacity, public trust, infrastructure, food security or rainfall resilience.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 md:col-span-2">
              <b className="text-white">5. Watch the critical indicators</b>
              <p className="mt-1">The visible result is tracked through temperature, ice, food, rainfall, trust, knowledge, aerosol burden and infrastructure. If a critical resilience indicator reaches 0%, the game ends. Stopping SAI suddenly after repeated deployment can also trigger termination shock.</p>
            </div>
          </div>
        </InfoCard>

        <InfoCard>
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><FlaskConical className="text-purple-400" /> Research gap: future particle development</h2>
          <div className="rounded-xl border-l-4 border-purple-400 bg-purple-950/20 p-4 text-lg text-purple-100">
            Can alternative engineered nanoparticles outperform sulfate aerosols while reducing environmental side effects?
          </div>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Sulfate is the known baseline. CaCO₃/calcite and alumina are solid-particle alternatives, but their lifetime, optical behaviour, surface chemistry, ozone effects and particle ageing remain uncertain. The future engineered particle is locked because unknown particles should not be deployed without research.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3 text-sm text-slate-300">
            <div className="rounded-xl border border-cyan-500/30 bg-slate-950/60 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold text-cyan-200"><Microscope size={16} /> Laboratory</h3>
              <ul className="space-y-1">
                <li>• aerosol generator</li>
                <li>• particle synthesis reactor</li>
                <li>• particle sizing, for example SMPS</li>
                <li>• coagulation chamber</li>
                <li>• surface-chemistry reactor</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/60 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold text-emerald-200"><Activity size={16} /> Measurements</h3>
              <ul className="space-y-1">
                <li>• particle size distribution</li>
                <li>• optical scattering</li>
                <li>• agglomeration behaviour</li>
                <li>• settling velocity</li>
                <li>• ozone-relevant surface reactions</li>
              </ul>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-slate-950/60 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold text-purple-200"><Brain size={16} /> Models</h3>
              <ul className="space-y-1">
                <li>• atmospheric transport model</li>
                <li>• aerosol microphysics model</li>
                <li>• climate model</li>
                <li>• crop / food-security impact model</li>
              </ul>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-purple-500/30 bg-slate-950/50 p-4 text-sm text-slate-300">
            The material comparison is deliberately incomplete at the beginning of the game. Players unlock deeper interpretation by increasing scientific knowledge through laboratory testing and monitoring.
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

function EventGraphicIllustration({ eventType }: { eventType?: 'chemistry' | 'drought' | 'ecosystem' | 'none' }) {
  if (!eventType || eventType === 'none') return null;

  return (
    <div className="relative my-4 overflow-hidden rounded-2xl border border-amber-500/50 bg-slate-950/90 p-4 shadow-2xl">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-48 h-28 shrink-0 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative flex items-center justify-center">
          {eventType === 'chemistry' && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 flex items-center justify-center p-2">
              <FlaskConical className="w-12 h-12 text-purple-400 animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(#c084fc_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />
            </div>
          )}
          {eventType === 'drought' && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 flex items-center justify-center p-2">
              <CloudRain className="w-12 h-12 text-amber-500 animate-bounce" />
              <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:14px_14px] opacity-30" />
            </div>
          )}
          {eventType === 'ecosystem' && (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex items-center justify-center p-2">
              <ShieldAlert className="w-12 h-12 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:12px_12px] opacity-30" />
            </div>
          )}
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Research-Inspired Hazard Event
          </div>
          <h4 className="text-base font-black text-white">
            {eventType === 'chemistry' && 'Stratospheric microphysical anomaly'}
            {eventType === 'drought' && 'Monsoon shift and regional drought'}
            {eventType === 'ecosystem' && 'Agricultural and environmental stress'}
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {eventType === 'chemistry' && 'Laboratory reaction assumptions faced unforeseen chlorine chemistry in the stratosphere.'}
            {eventType === 'drought' && 'Targeting polar latitudes caused a lower-latitude shift in precipitation cycles, stressing regional monsoons.'}
            {eventType === 'ecosystem' && 'Changes in sunlight and rainfall may affect crop performance and create public concern about environmental side effects.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function DynamicEarthCanvas({ indicators, target, particle }: { indicators: Indicators; target: TargetChoice; particle: ParticleChoice }) {
  const status = earthStatus(indicators);
  const solarIrradiance = Math.max(30, Math.round(100 - indicators.aerosolBurden * 0.3 - (target === 'aggressive' ? 6 : target === 'emergency' ? 12 : 0)));
  const rainTone = visualTier(indicators.rain);
  const foodTone = visualTier(indicators.food);
  const iceTone = visualTier(indicators.ice);
  const trustTone = visualTier(indicators.trust);
  const burdenLabel = indicators.aerosolBurden > 75 ? 'High side-effect pressure' : indicators.aerosolBurden > 55 ? 'Elevated burden' : indicators.aerosolBurden > 25 ? 'Managed aerosol layer' : 'Low burden';
  const rainDrops = indicators.rain >= 70 ? 34 : indicators.rain >= 45 ? 22 : indicators.rain >= 25 ? 12 : 4;
  const cropCount = indicators.food >= 70 ? 9 : indicators.food >= 45 ? 6 : indicators.food >= 25 ? 4 : 2;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
      <EarthSunVisualizer indicators={indicators} target={target} />

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Sun size={15} /> Surface sunlight</div>
          <div className="mt-2 text-2xl font-black text-white">{solarIrradiance}%</div>
          <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-amber-300" style={{ width: `${solarIrradiance}%` }} /></div>
          <p className="mt-2 text-xs text-slate-400">Falls when aerosol burden or cooling ambition increases.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Gauge size={15} /> Aerosol burden</div>
          <div className="mt-2 text-2xl font-black text-white">{indicators.aerosolBurden}%</div>
          <div className="mt-2 h-2 rounded-full bg-slate-800"><div className={`h-2 rounded-full ${indicators.aerosolBurden > 65 ? 'bg-red-500' : indicators.aerosolBurden > 45 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${indicators.aerosolBurden}%` }} /></div>
          <p className="mt-2 text-xs text-slate-400">{burdenLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Earth state</div>
          <div className="mt-2 flex items-center gap-2"><span className="text-2xl">{status.emoji}</span><span className="font-black text-white">{status.label}</span></div>
          <p className="mt-2 text-xs text-slate-400">{status.detail}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Snowflake size={15} /> Arctic ice</div>
          <div className="mt-2 text-2xl font-black text-white">{indicators.ice}%</div>
          <div className="mt-2 h-2 rounded-full bg-slate-800"><div className={`h-2 rounded-full ${iceTone.bar}`} style={{ width: `${indicators.ice}%` }} /></div>
          <p className={`mt-2 text-xs ${iceTone.text}`}>{iceTone.label}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CloudRain className={`h-5 w-5 ${rainTone.text}`} />
              <div>
                <div className="text-sm font-black text-white">Precipitation & monsoon health</div>
                <div className="text-xs text-slate-400">Driven by rain stability, location choice and aerosol side effects.</div>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${rainTone.chip}`}>{indicators.rain}% · {rainTone.label}</span>
          </div>
          <div className="relative h-40 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-amber-950/60 to-transparent" />
            {indicators.rain >= 25 ? (
              [...Array(rainDrops)].map((_, i) => (
                <span
                  key={i}
                  className="absolute h-8 w-0.5 -rotate-12 rounded-full bg-cyan-300/80"
                  style={{ left: `${(i * 37) % 100}%`, top: `${(i * 19) % 70}%`, opacity: Math.max(0.25, indicators.rain / 100), height: `${14 + indicators.rain / 4}px` }}
                />
              ))
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-black uppercase tracking-widest text-red-300">Critical drought / monsoon failure</div>
            )}
            {indicators.rain < 45 && (
              <svg className="absolute bottom-0 left-0 h-20 w-full text-orange-900/70" viewBox="0 0 500 100" preserveAspectRatio="none">
                <path d="M0 100 L500 100 L500 55 C420 80 380 45 310 70 C245 92 215 45 160 72 C95 100 60 55 0 80 Z" fill="currentColor" />
                <path d="M70 88 L105 65 M190 92 L220 60 M335 87 L380 58" stroke="#f59e0b" strokeWidth="3" opacity="0.45" />
              </svg>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wheat className={`h-5 w-5 ${foodTone.text}`} />
              <div>
                <div className="text-sm font-black text-white">Agricultural & crop health</div>
                <div className="text-xs text-slate-400">Responds to food security, rainfall, sunlight and overcooling pressure.</div>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${foodTone.chip}`}>{indicators.food}% · {foodTone.label}</span>
          </div>
          <div className="relative h-40 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/20">
            <div className="absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-emerald-950/70 to-transparent" />
            {[...Array(cropCount)].map((_, i) => {
              const healthy = indicators.food >= 70;
              const stressed = indicators.food < 70 && indicators.food >= 35;
              const height = healthy ? 72 + (i % 3) * 10 : stressed ? 48 + (i % 3) * 7 : 28 + (i % 2) * 6;
              const color = healthy ? '#34d399' : stressed ? '#fbbf24' : '#ef4444';
              return (
                <svg key={i} className="absolute bottom-7" style={{ left: `${8 + i * (84 / Math.max(1, cropCount))}%`, height, width: 28 }} viewBox="0 0 28 90" fill="none">
                  <path d="M14 90 C14 65 15 35 14 5" stroke={color} strokeWidth="4" strokeLinecap="round" />
                  <path d="M14 50 C4 45 4 33 13 33" stroke={color} strokeWidth="3" strokeLinecap="round" />
                  <path d="M15 38 C27 33 26 21 16 21" stroke={color} strokeWidth="3" strokeLinecap="round" />
                  {indicators.food < 35 && <path d="M4 88 C11 78 20 83 27 72" stroke="#7f1d1d" strokeWidth="2" opacity="0.75" />}
                </svg>
              );
            })}
            {indicators.food < 45 && <div className="absolute inset-0 bg-orange-950/20" />}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300"><b className="text-white">Material selected:</b> {particleMeta[particle].label}</div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300"><b className="text-white">Public trust:</b> <span className={trustTone.text}>{indicators.trust}% · {trustTone.label}</span></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300"><b className="text-white">Temperature:</b> +{indicators.temperature.toFixed(2)}°C</div>
      </div>
    </div>
  );
}

function ResearchInsightTracker({ knowledge, futureUnlocked }: { knowledge: number; futureUnlocked: boolean }) {
  const items = [
    {
      threshold: 30,
      title: '30% Knowledge: hydroclimate insights',
      text: 'Unlocks target parameter changes and regional monsoon trade-off analysis.',
    },
    {
      threshold: 60,
      title: '60% Knowledge: microphysics and ozone chemistry',
      text: 'Unlocks solid particle chemistry, stratospheric heating, and ozone feedback insights.',
    },
    {
      threshold: 80,
      title: '80% Knowledge: Engineered Aerosols Unlocked',
      text: futureUnlocked
        ? 'Future engineered particles are unlocked for high-efficiency deployment.'
        : 'Future engineered particles unlock once year >= 2090.',
    },
    {
      threshold: 100,
      title: '100% Knowledge: Complete Scientific Precision',
      text: knowledge >= 100 
        ? 'FULL MASTERY ACHIEVED: Perfect predictive insights unlocked across all decade reports!'
        : 'Requires sustained testing across decades to achieve.',
    },
  ];

  return (
    <InfoCard>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><Brain className="text-purple-400" /> Scientific Knowledge Tracker</h2>
      <div className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-sm text-purple-100">
        Scientific Knowledge: <b>{knowledge}% / 100%</b>
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
              <div className="mt-2">{unlocked ? item.text : 'Locked: advance scientific knowledge to unlock.'}</div>
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
    let reportTitle = 'Decade Overview';
    let reportText = 'The climate system responded to your governance decisions.';
    let eventType: 'chemistry' | 'drought' | 'ecosystem' | 'none' = 'none';

    if (target === 'none') {
      next.temperature = withoutSAI;
      next.ice -= 6;
      next.food -= 4;
      next.rain -= 3;
      next.trust += 2;
      next.aerosolBurden -= 15;
      next.infrastructure += 2;
      reportText = 'No SAI deployed this decade. Direct aerosol side effects avoided, but baseline global warming continued.';
    } else {
      let desiredTemp = targetTemperature(target, withoutSAI);
      next.temperature = Math.max(0.4, desiredTemp);

      if (target === 'moderate') {
        next.food -= 1;
        next.rain -= 2;
        next.trust += 2;
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
        next.knowledge += 1;
        next.food += 1;
        next.trust -= indicators.knowledge < 60 ? 2 : 0;
        next.aerosolBurden += 3;
      }
      if (particle === 'alumina') {
        next.knowledge += 2;
        next.rain -= 1;
        next.trust -= indicators.knowledge < 60 ? 3 : 1;
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
      if (season === 'autumn') { next.ice += 8; next.rain += 2; }

      if (location === 'tropical') next.rain += 1;
      if (location === 'subtropical') { next.ice += 3; next.rain -= 1; }
      if (location === 'polar') { next.ice += 12; next.rain -= 6; next.food -= 3; }
    }

    if (research === 'lab') {
      next.knowledge += 8;
      next.trust += 3;
      next.infrastructure += 2;
    }
    if (research === 'monitoring') {
      next.knowledge += 3;
      next.trust += 10;
      next.infrastructure += 8;
    }
    if (research === 'adaptation') {
      next.trust += 12;
      next.food += 10;
      next.rain += 6;
    }

    applyBurdenPressure(next);

    let eventChance = calcEventChance(target, particle, location, research, next);
    if (Math.random() < eventChance) {
      const eventRoll = Math.random();
      if ((particle === 'alumina' || particle === 'caco3' || particle === 'future') && eventRoll < 0.35) {
        next.knowledge += 3;
        next.trust -= 8;
        next.rain -= 4;
        event = 'Material chemistry surprise: laboratory assumptions faced stratospheric chemistry uncertainties.';
        reportTitle = 'Decade Report: Material Surprises';
        eventType = 'chemistry';
      } else if (location === 'polar' && eventRoll < 0.70) {
        next.rain -= 6;
        next.food -= 4;
        next.trust -= 5;
        event = 'Regional hydroclimate shift: polar targeting cooled high latitudes but shifted lower-latitude rainfall.';
        reportTitle = 'Decade Report: Regional Hydroclimate Shift';
        eventType = 'drought';
      } else {
        next.food -= 4;
        next.rain -= 3;
        next.trust -= 4;
        event = 'Agricultural and environmental uncertainty: reported crop impacts increased public scrutiny.';
        reportTitle = 'Decade Report: Agricultural and Environmental Scrutiny';
        eventType = 'ecosystem';
      }
    }

    const rounded = roundIndicators(next);

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
    setReport({ year: nextYear, title: reportTitle, text: reportText, event, eventType, previous, current: rounded, cost: currentCost, choices: entry });
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
        <div className="max-w-4xl rounded-3xl border border-red-800 bg-red-950/40 p-8 shadow-2xl shadow-red-950/50 space-y-6">
          <div className="flex flex-col items-center text-center">
            <AlertOctagon className="mb-3 text-red-500 animate-pulse" size={80} />
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/80 px-3 py-1 text-xs text-red-200 font-bold uppercase tracking-widest mb-2">
              CRITICAL SYSTEM FAILURE
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white">Termination Shock Triggered</h1>
            <p className="mt-2 text-sm text-red-300 font-mono">Termination-shock mechanism</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-left text-sm">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-2">
              <h3 className="font-black text-base text-red-400 flex items-center gap-2">
                ⚡ Why Did This Happen?
              </h3>
              <p className="text-slate-300 leading-relaxed text-xs">
                You abruptly suspended active Solar Radiation Management after masking warming for multiple decades. Because stratospheric aerosols decay out of the atmosphere within 1 to 2 years while underlying greenhouse gas ($GHG$) concentrations remain elevated, the artificial cooling shield vanished rapidly.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-2">
              <h3 className="font-black text-base text-amber-400 flex items-center gap-2">
                💥 What Does This Mean?
              </h3>
              <p className="text-slate-300 leading-relaxed text-xs">
                Global temperatures surged rapidly back toward unmitigated warming baseline levels. This rate of warming occurs up to **10 to 20 times faster** than natural climate change, overwhelming biological ecosystems, agricultural crop resilience, and emergency infrastructure.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-800/60 bg-purple-950/30 p-5 text-left text-xs space-y-2">
            <b className="text-purple-300 text-sm block">🔬 Governance takeaway:</b>
            <p className="text-slate-300 leading-relaxed">
              Termination shock is not an inherent flaw in aerosol physics, but a <b>failure of governance continuity</b>. To avoid termination shock, solar geoengineering must either be maintained continuously alongside aggressive decarbonization or phased down very slowly over many decades.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <button onClick={resetGame} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-8 py-4 font-black text-white hover:bg-red-500 shadow-xl transition">
              <RefreshCcw size={18} /> Restart Challenge
            </button>
          </div>
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
            A vital planetary or social resilience metric dropped to zero, triggering planetary instability. Use Monitoring or Compensation & Adaptation support actions to shield vulnerable metrics!
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
      <MetricCard icon={<Beaker size={22} />} title="Knowledge" value={`${indicators.knowledge}%`} tone={indicators.knowledge >= 100 ? 'text-emerald-400 font-bold' : indicators.knowledge >= 50 ? 'text-purple-400 font-bold' : 'text-amber-400'} />
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
            {indicators.knowledge >= 100 && (
              <p className="mt-2 text-purple-300 font-semibold">🏆 Scientific Mastery Reached: 100% Knowledge Achieved!</p>
            )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900/95 p-6 md:p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-3 py-1 text-xs text-blue-300 font-bold mb-2">
                  <Globe2 size={14} /> DECADE EXECUTIVE SUMMARY
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">{report.title} ({report.year - 10}–{report.year})</h2>
              </div>
              <button onClick={closeReport} className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-500 transition">
                Proceed to {report.year}
              </button>
            </div>

            <p className="mb-4 text-slate-300 text-base leading-relaxed">{report.text}</p>

            <EventGraphicIllustration eventType={report.eventType} />

            <div className="my-6">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">Resilience & Planetary Indicators Delta</h3>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
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
                    <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
                      <div className="mt-1 text-2xl font-black text-white">{value}</div>
                      <div className={`text-xs font-black mt-1 ${diff.className}`}>{diff.text}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <InfoCard>
              <h3 className="mb-3 text-lg font-black text-white flex items-center gap-2">
                <Brain className="text-purple-400" /> Research-Backed Executive Analysis
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {strategyExplanation(report.choices, report.current.knowledge).map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </InfoCard>
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
                    <ChoiceCard selected={target === 'none'} title="No SAI / pause" subtitle={targetSubtitle('none', indicators.knowledge)} cost={targetMeta.none.cost} tone="amber" onClick={() => setTarget('none')} />
                    <ChoiceCard selected={target === 'moderate'} title="Stabilize near 1.5°C" subtitle={targetSubtitle('moderate', indicators.knowledge)} cost={targetMeta.moderate.cost} tone="blue" onClick={() => setTarget('moderate')} />
                    <ChoiceCard selected={target === 'aggressive'} title="Aggressive cooling near 1.0°C" subtitle={targetSubtitle('aggressive', indicators.knowledge)} cost={targetMeta.aggressive.cost} tone="emerald" onClick={() => setTarget('aggressive')} />
                    <ChoiceCard selected={target === 'emergency'} disabled={!emergencyUnlocked} title="Emergency cooling near 0.8°C" subtitle={emergencyUnlocked ? targetSubtitle('emergency', indicators.knowledge) : 'Locked until 2070 or severe warming.'} cost={targetMeta.emergency.cost} tone="red" onClick={() => setTarget('emergency')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Activity size={16} /> Level 2: Seasonality</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={season === 'annual'} title="Annual injection" subtitle={seasonSubtitle('annual', indicators.knowledge, target === 'none')} cost={seasonMeta.annual.cost} onClick={() => setSeason('annual')} />
                    <ChoiceCard selected={season === 'spring'} title="Spring injection" subtitle={seasonSubtitle('spring', indicators.knowledge, target === 'none')} cost={seasonMeta.spring.cost} tone="amber" onClick={() => setSeason('spring')} />
                    <ChoiceCard selected={season === 'autumn'} title="Autumn injection" subtitle={seasonSubtitle('autumn', indicators.knowledge, target === 'none')} cost={seasonMeta.autumn.cost} tone="emerald" onClick={() => setSeason('autumn')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Globe2 size={16} /> Level 3: Injection Location</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={location === 'tropical'} title="Tropical / equatorial" subtitle={locationSubtitle('tropical', indicators.knowledge, target === 'none')} cost={locationMeta.tropical.cost} onClick={() => setLocation('tropical')} />
                    <ChoiceCard selected={location === 'subtropical'} title="Subtropical" subtitle={locationSubtitle('subtropical', indicators.knowledge, target === 'none')} cost={locationMeta.subtropical.cost} tone="blue" onClick={() => setLocation('subtropical')} />
                    <ChoiceCard selected={location === 'polar'} title="Polar" subtitle={locationSubtitle('polar', indicators.knowledge, target === 'none')} cost={locationMeta.polar.cost} tone="red" onClick={() => setLocation('polar')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Atom size={16} /> Level 4: Material Selection</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={particle === 'sulfate'} title="Sulfate particles" subtitle={materialSubtitle('sulfate', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.sulfate.cost} tone="blue" onClick={() => setParticle('sulfate')} />
                    <ChoiceCard selected={particle === 'caco3'} title="CaCO₃ / calcite particles" subtitle={materialSubtitle('caco3', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.caco3.cost} tone="purple" onClick={() => setParticle('caco3')} />
                    <ChoiceCard selected={particle === 'alumina'} title="Alumina particles" subtitle={materialSubtitle('alumina', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.alumina.cost} tone="amber" onClick={() => setParticle('alumina')} />
                    <ChoiceCard selected={particle === 'future'} disabled={!futureUnlocked} title="Future engineered particle" subtitle={materialSubtitle('future', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.future.cost} tone="red" onClick={() => setParticle('future')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Microscope size={16} /> Support Action</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={research === 'none'} title="No support action" subtitle={supportSubtitle('none', indicators.knowledge)} cost={researchMeta.none.cost} onClick={() => setResearch('none')} />
                    <ChoiceCard selected={research === 'lab'} title="Laboratory particle testing" subtitle={supportSubtitle('lab', indicators.knowledge)} cost={researchMeta.lab.cost} tone="purple" onClick={() => setResearch('lab')} />
                    <ChoiceCard selected={research === 'monitoring'} title="Monitoring and open data" subtitle={supportSubtitle('monitoring', indicators.knowledge)} cost={researchMeta.monitoring.cost} tone="emerald" onClick={() => setResearch('monitoring')} />
                    <ChoiceCard selected={research === 'adaptation'} title="Compensation and adaptation" subtitle={supportSubtitle('adaptation', indicators.knowledge)} cost={researchMeta.adaptation.cost} tone="amber" onClick={() => setResearch('adaptation')} />
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
