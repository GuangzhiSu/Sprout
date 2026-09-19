"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Table2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import {
  bandFor,
  cusum,
  longDate,
  shortDate,
  statusFor,
  subscales,
  totalScore,
  type ScorePoint,
} from "@/lib/tracking";

/* Chart roles — the same values the stylesheet defines, in the one place
   recharts needs them as props rather than CSS. */
const SERIES = "#2a78d6";
const SURFACE = "#ffffff";
const GRID = "#E1E0D9";
const AXIS = "#C3C2B7";
const AXIS_INK = "#7D8F97";

/** Pad a score range out to whole fives so the ticks stay round. */
function domainFor(points: ScorePoint[]): [number, number] {
  const values = points.map((point) => point.value);
  const low = Math.floor((Math.min(...values) - 4) / 5) * 5;
  const high = Math.ceil((Math.max(...values) + 4) / 5) * 5;
  return [low, high];
}

/** Ticks every five points — recharts' own choice lands on 81, 74, 67. */
function ticksFor(low: number, high: number, step: number) {
  const ticks: number[] = [];
  for (let value = low; value <= high; value += step) ticks.push(value);
  return ticks;
}

type TipProps = {
  active?: boolean;
  payload?: { value?: number | string; payload?: ScorePoint }[];
};

function ChartTip({ active, payload }: TipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="chart-tip">
      <span>{longDate(point.date)}</span>
      <strong>{point.value}</strong>
      <em>T-score · {bandFor(point.value).label}</em>
    </div>
  );
}

type ChartProps = {
  points: ScorePoint[];
  /** Baseline drawn as a reference line — the CUSUM target. */
  baseline?: number;
  height?: number;
  /** Named for screen readers; the table view carries the numbers. */
  label: string;
  compact?: boolean;
};

/**
 * One measure over time. Single series, so no legend — the title says what is
 * plotted. Lower is better, which the axis note spells out rather than implying.
 */
export function ScoreChart({ points, baseline, height = 280, label, compact = false }: ChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const [low, high] = domainFor(points);
  const last = points[points.length - 1];

  return (
    <div className="chart-frame" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 18, right: 26, bottom: 4, left: 0 }} accessibilityLayer>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.16} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: AXIS_INK, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: AXIS }}
            interval={compact ? 2 : "preserveStartEnd"}
            minTickGap={16}
          />
          <YAxis
            domain={[low, high]}
            width={38}
            tick={{ fill: AXIS_INK, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            ticks={ticksFor(low, high, compact ? 10 : 5)}
            interval={0}
          />
          {baseline !== undefined && (
            <ReferenceLine
              y={baseline}
              stroke={AXIS}
              strokeWidth={1}
              label={{ value: `Baseline ${baseline}`, position: "insideTopRight", fill: AXIS_INK, fontSize: 11 }}
            />
          )}
          <Tooltip cursor={{ stroke: AXIS_INK, strokeWidth: 1 }} content={<ChartTip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={SERIES}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${gradientId})`}
            dot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={last.date}
            y={last.value}
            r={0}
            label={{ value: String(last.value), position: "top", fill: "#21313A", fontSize: 13, fontWeight: 800 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The numbers behind the chart, for anyone the colours do not work for. */
function ScoreTable({ points, caption }: { points: ScorePoint[]; caption: string }) {
  return (
    <table className="score-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">T-score</th>
          <th scope="col">Range</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.date}>
            <td>{longDate(point.date)}</td>
            <td>{point.value}</td>
            <td>{bandFor(point.value).label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** SRS-2 total score: the chart, and the same numbers as a table on request. */
export function TotalScorePanel() {
  const [showTable, setShowTable] = useState(false);
  const result = cusum(totalScore);

  return (
    <div className="card chart-card">
      <div className="chart-card__head">
        <h3 className="chart-card__title">SRS-2 Score</h3>
        <p className="chart-card__hint">T-score · a lower line means less difficulty</p>
      </div>

      <ScoreChart
        points={totalScore}
        baseline={result.target}
        label={`SRS-2 total T-score from ${longDate(totalScore[0].date)} to ${longDate(totalScore[totalScore.length - 1].date)}, falling from ${totalScore[0].value} to ${totalScore[totalScore.length - 1].value}.`}
      />

      <div className="chart-tools">
        <button type="button" className="link-button" onClick={() => setShowTable((open) => !open)} aria-expanded={showTable}>
          <Table2 aria-hidden="true" /> {showTable ? "Hide the numbers" : "Show the numbers"}
        </button>
      </div>

      {showTable && <ScoreTable points={totalScore} caption="Every SRS-2 total score recorded so far." />}
    </div>
  );
}

/** The five subscales, folded away until a parent asks for them. */
export function SubscaleDetails() {
  const [open, setOpen] = useState(false);

  return (
    <div className="detail">
      <button type="button" className="detail__toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="subscale-details">
        Details <ChevronDown aria-hidden="true" />
        <span className="detail__count">{subscales.length} subscales</span>
      </button>

      <div className="detail__body" id="subscale-details" hidden={!open}>
        {subscales.map((subscale) => {
          const result = cusum(subscale.series);
          const status = statusFor(result);
          const latest = subscale.series[subscale.series.length - 1];

          return (
            <div className="card chart-card" key={subscale.id}>
              <div className="subscale__head">
                <div>
                  <h4 className="chart-card__title">{subscale.name}</h4>
                  <p className="chart-card__about">{subscale.about}</p>
                </div>
                <StatusChip status={status} size="sm" />
              </div>
              <ScoreChart
                points={subscale.series}
                baseline={result.target}
                height={170}
                compact
                label={`${subscale.name} T-score over time, most recently ${latest.value} on ${longDate(latest.date)}.`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
