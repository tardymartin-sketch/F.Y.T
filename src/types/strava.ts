// ============================================================
// F.Y.T - STRAVA TYPES
// src/types/strava.ts
// ============================================================

export interface StravaTokenResponse {
  token_type: 'Bearer';
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  username: string | null;
  resource_state: number;
  firstname: string;
  lastname: string;
  city: string | null;
  state: string | null;
  country: string | null;
  sex: 'M' | 'F' | null;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  profile_medium: string;
  profile: string;
}

export interface StravaConnection {
  id: string;
  user_id: string;
  strava_athlete_id: number;
  strava_username: string | null;
  strava_firstname: string | null;
  strava_lastname: string | null;
  strava_profile_pic: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

export type StravaSportType = 
  | 'AlpineSki' | 'BackcountrySki' | 'Canoeing' | 'Crossfit' 
  | 'EBikeRide' | 'Elliptical' | 'Golf' | 'GravelRide' 
  | 'Handcycle' | 'Hike' | 'IceSkate' | 'InlineSkate' 
  | 'Kayaking' | 'Kitesurf' | 'MountainBikeRide' | 'NordicSki' 
  | 'Ride' | 'RockClimbing' | 'RollerSki' | 'Rowing' 
  | 'Run' | 'Sail' | 'Skateboard' | 'Snowboard' 
  | 'Snowshoe' | 'Soccer' | 'StairStepper' | 'StandUpPaddling' 
  | 'Surfing' | 'Swim' | 'TrailRun' | 'Velomobile' 
  | 'VirtualRide' | 'VirtualRun' | 'Walk' | 'WeightTraining' 
  | 'Wheelchair' | 'Windsurf' | 'Workout' | 'Yoga';

export interface StravaActivity {
  id: number;
  resource_state: number;
  external_id: string | null;
  upload_id: number | null;
  athlete: { id: number; resource_state: number };
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: StravaSportType;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: StravaMap;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: 'everyone' | 'followers_only' | 'only_me';
  flagged: boolean;
  gear_id: string | null;
  from_accepted_tag: boolean | null;
  average_speed: number;
  max_speed: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high?: number;
  elev_low?: number;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  workout_type?: number;
  suffer_score?: number;
  description?: string;
  calories?: number;
  device_name?: string;
  embed_token?: string;
  average_cadence?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  average_temp?: number;
}

export interface StravaMap {
  id: string;
  polyline?: string;
  resource_state: number;
  summary_polyline?: string;
}

export interface StravaStreams {
  time?: { data: number[] };
  distance?: { data: number[] };
  latlng?: { data: [number, number][] };
  altitude?: { data: number[] };
  velocity_smooth?: { data: number[] };
  heartrate?: { data: number[] };
  cadence?: { data: number[] };
  watts?: { data: number[] };
  temp?: { data: number[] };
  moving?: { data: boolean[] };
  grade_smooth?: { data: number[] };
}

export interface StravaActivityDB {
  id: string;
  user_id: string;
  strava_activity_id: number;
  name: string;
  sport_type: StravaSportType;
  start_date: string;
  start_date_local?: string | null;
  timezone?: string | null;
  start_latlng?: [number, number] | null;
  end_latlng?: [number, number] | null;
  distance: number | null;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number | null;
  average_speed: number | null;
  max_speed: number | null;
  has_heartrate?: boolean | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  summary_polyline: string | null;
  streams_data: StravaStreams | null;
  segment_efforts: StravaSegmentEffort[] | null;
  calories: number | null;
  is_imported_to_history: boolean;
  imported_at: string | null;
  session_log_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StravaSegmentEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_index: number;
  end_index: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  segment: {
    id: number;
    name: string;
    distance: number;
    average_grade: number;
    maximum_grade: number;
    elevation_high: number;
    elevation_low: number;
    climb_category: number;
  };
  pr_rank?: number | null;
  achievements?: { type_id: number; type: string; rank: number }[];
}

export interface StravaActivityCard {
  id: string;
  stravaId: number;
  name: string;
  sportType: StravaSportType;
  sportIcon: string;
  sportColor: string;
  date: Date;
  dateFormatted: string;
  duration: string;
  distance: string | null;
  pace: string | null;
  speed: string | null;
  elevation: string | null;
  hasHeartrate: boolean;
  avgHeartrate: number | null;
  maxHeartrate: number | null;
  hasMap: boolean;
  polyline: string | null;
  isImported: boolean;
  isSelected: boolean;
}

export const SPORT_TYPE_CONFIG: Record<string, {
  icon: string;
  label: string;
  color: string;
  showDistance: boolean;
  showPace: boolean;
  showSpeed: boolean;
}> = {
  Run: { icon: '🏃', label: 'Course', color: '#FC4C02', showDistance: true, showPace: true, showSpeed: false },
  TrailRun: { icon: '🏔️', label: 'Trail', color: '#2D5016', showDistance: true, showPace: true, showSpeed: false },
  Walk: { icon: '🚶', label: 'Marche', color: '#8B4513', showDistance: true, showPace: true, showSpeed: false },
  Hike: { icon: '🥾', label: 'Randonnée', color: '#228B22', showDistance: true, showPace: false, showSpeed: false },
  Ride: { icon: '🚴', label: 'Vélo', color: '#1E90FF', showDistance: true, showPace: false, showSpeed: true },
  MountainBikeRide: { icon: '🚵', label: 'VTT', color: '#8B4513', showDistance: true, showPace: false, showSpeed: true },
  GravelRide: { icon: '🚴', label: 'Gravel', color: '#A0522D', showDistance: true, showPace: false, showSpeed: true },
  EBikeRide: { icon: '🔋', label: 'VAE', color: '#32CD32', showDistance: true, showPace: false, showSpeed: true },
  VirtualRide: { icon: '🖥️', label: 'Vélo virtuel', color: '#4169E1', showDistance: true, showPace: false, showSpeed: true },
  Swim: { icon: '🏊', label: 'Natation', color: '#00CED1', showDistance: true, showPace: true, showSpeed: false },
  WeightTraining: { icon: '🏋️', label: 'Musculation', color: '#DC143C', showDistance: false, showPace: false, showSpeed: false },
  Yoga: { icon: '🧘', label: 'Yoga', color: '#9370DB', showDistance: false, showPace: false, showSpeed: false },
  Workout: { icon: '💪', label: 'Entraînement', color: '#FF6347', showDistance: false, showPace: false, showSpeed: false },
  Crossfit: { icon: '🔥', label: 'CrossFit', color: '#FF4500', showDistance: false, showPace: false, showSpeed: false },
  Rowing: { icon: '🚣', label: 'Aviron', color: '#4682B4', showDistance: true, showPace: false, showSpeed: true },
  Elliptical: { icon: '🔄', label: 'Elliptique', color: '#778899', showDistance: false, showPace: false, showSpeed: false },
  StairStepper: { icon: '🪜', label: 'Stepper', color: '#696969', showDistance: false, showPace: false, showSpeed: false },
};

export const DEFAULT_SPORT_CONFIG = {
  icon: '🏅',
  label: 'Activité',
  color: '#808080',
  showDistance: true,
  showPace: false,
  showSpeed: false
};
