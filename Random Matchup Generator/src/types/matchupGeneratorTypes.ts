export type FactionStats = {
    survivability: number;
    melee_strength: number;
    ranged_strength: number;
    cavalry_prowess: number;
    pilla_prowess: number;
    total_strength: number;
    tier: string;
};

export interface Faction {
    name: string;
    type: string;
    torts_enabled: boolean;
    stats?: FactionStats;
}

export interface Map {
    name: string;
    type: string;
    requiresTorts: boolean;
}

export interface Team {
    player: string;
    faction: string;
    stats: FactionStats;
}

export interface MatchupResult {
    map: string;
    teams: Team[][];
    teamStrengths: number[];
}

export interface GeneratorState {
    gameType: string;
    settlementType: string;
    players: string[];
    teamPercentages: { team1: number; team2: number } | null;
    recentlyUsedFactions: Record<string, FactionUsage>;
    result: MatchupResult | null;
    factionStats: Record<string, FactionStats>;
}

export interface FactionUsage {
    count: number;
    lastPlayer: string;
}