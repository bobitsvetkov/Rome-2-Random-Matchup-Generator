import { factions } from "../components/factionList";
import { Faction } from "../types/matchupGeneratorTypes";

export const getPlayerCount = (type: string) => parseInt(type.charAt(0)) * 2;

export const hasValidTortsFaction = (team: Array<{ faction: string }>) => {
    return team.some(member =>
        factions.find(f => f.name === member.faction)?.torts_enabled
    );
};

export const calculateFactionScore = (faction: Faction): number => {
    if (!faction.stats) return 0;

    const maxPossibleStrength = 2000;
    const normalizedScore = (faction.stats.total_strength / maxPossibleStrength) * 10;

    return parseFloat(normalizedScore.toFixed(2));
};

export const calculateTeamScore = (team: Faction[]): number => {
    return team.reduce((total, faction) => total + calculateFactionScore(faction), 0);
};

interface TeamMember {
    player: string;
    faction: string;
    stats:  Record<string, unknown>;
}

export const assignTeams = (players: string[], factions: Faction[], teamCount: number) => {
    const teams: TeamMember[][] = Array.from({ length: teamCount }, () => []);
    let playerIndex = 0;
    factions.forEach(faction => {
        const team = playerIndex % teamCount;
        teams[team].push({
            player: players[playerIndex] || `Player ${playerIndex + 1}`,
            faction: faction.name,
            stats: faction.stats || {},
        });
        playerIndex++;
    });
    return teams;
};

interface ResetFactionsOptions {
    type?: string;
    stats?: Record<string, unknown>;
    name: string;
}

interface FactionsWithStats extends ResetFactionsOptions {
    type: string;
    stats?: Record<string, unknown>;
}

export const resetFactionsIfNeeded = (
    availableFactions: ResetFactionsOptions[],
    factionsWithStats: FactionsWithStats[],
    usedFactions: string[],
    options: string[]
): ResetFactionsOptions[] => {
    if (availableFactions.length === 0) {
        let resetFactions = factionsWithStats.filter(f => !usedFactions.includes(f.name));
        if (options.includes("banSally")) {
            resetFactions = resetFactions.filter(f => f.type !== "sally");
        }
        return resetFactions;
    }
    return availableFactions;
};