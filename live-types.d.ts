export type RaceStatus = 'unknown' | 'not_started' | 'green' | 'yellow' | 'vsc' | 'safety_car' | 'red_flag' | 'suspended' | 'finished';
export interface LiveSession {
  id: string; meetingId?: string; sessionName?: string; series: string; grandPrixName: string; country: string; countryCode?: string;
  circuitName: string; trackId?: string; startTime?: string; endTime?: string;
  currentLap: number | null; totalLaps: number | null; status: RaceStatus;
  /** Confirmed by the backend, never inferred from the schedule alone. */
  isLive: boolean;
}
export interface LiveDriver {
  id: string; number: string; abbreviation: string; name: string; team: string; color: string;
  position: number | null; gap: number | string | null; interval: number | string | null;
  tyre: string | null; tyreAge: number | null; lastLap: number | null; bestLap: number | null;
  positionChange: number | null; completedLaps: number | null;
  retired?: boolean; inPit?: boolean; bestLapNumber?: number | null;
}
export interface LiveWeather {
  updatedAt: string | null; air: number | null; track: number | null; humidity: number | null;
  windKmh: number | null; windDirection: number | null; rain: boolean | null;
}
export interface LiveEvent { id: string; timestamp: string; lap: number | null; type: string; tone: 'neutral' | 'yellow' | 'red' | 'green' | 'purple'; message: string; driver: string | null; }
export interface LiveRaceState {
  schemaVersion: 1; mode: 'live' | 'replay' | 'demo'; updatedAt: string;
  session: LiveSession | null; drivers: LiveDriver[]; weather: LiveWeather | null; events: LiveEvent[];
  fastestLap: { driverId: string; name: string; seconds: number; lap: number | null } | null;
  /** Each category's last successful provider check (not browser download time). */
  feeds: Record<string, { updatedAt: string | null; error: string | null }>;
}
