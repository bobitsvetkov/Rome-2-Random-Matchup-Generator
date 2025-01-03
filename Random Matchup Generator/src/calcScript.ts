import factionModifiersData from "./data/faction_modifiers.json";
import unitsStatsData from "./data/units_stats.json";

type Unit = {
    Armor?: number;
    HP?: number;
    Morale?: number;
    "Missile Block Chance"?: number;
    "Melee Defense"?: number;
    "Melee Attack"?: number;
    "Base Damage"?: number;
    "Charge Bonus"?: number;
    "AP Damage"?: number;
    "Bonus vs Infantry"?: number;
    Range?: number;
    "Base Missile Damage"?: number;
    Accuracy?: number;
    "AP Missile Damage"?: number;
    Ammo?: number;
    Class?: string;
    "Missile Damage"?: number;
    Faction?: string;
};

type FactionModifiers = {
    survivability: number;
    melee_strength: number;
    ranged_strength: number;
    cavalry_prowess: number;
    pilla_prowess: number;
};

type FactionStats = {
    survivability: number;
    melee_strength: number;
    ranged_strength: number;
    cavalry_prowess: number;
    pilla_prowess: number;
    total_strength: number;
    tier: string;
};

type FactionModifiersData = Record<string, FactionModifiers>;
type UnitsStatsData = Unit[];

const factionModifiersDataJson: FactionModifiersData = factionModifiersData;
const unitsStatsDataJson: UnitsStatsData = unitsStatsData;

const groupUnitsByFaction = (units: Unit[]): Record<string, Unit[]> => {
    const factions: Record<string, Unit[]> = {};
    units.forEach((unit) => {
        const factionName = unit.Faction || "Unknown";
        if (!factions[factionName]) {
            factions[factionName] = [];
        }
        factions[factionName].push(unit);
    });
    return factions;
};

export const calculateFactionStats = (
    units: Unit[],
    factionModifiers: FactionModifiers
): FactionStats => {
    const stats = {
        survivability: 0,
        melee_strength: 0,
        ranged_strength: 0,
        cavalry_prowess: 0,
        pilla_prowess: 0,
    };

    let missileUnitsCount = 0;
    let cavalryUnitsCount = 0;
    let pillaUnitsCount = 0;

    if (Array.isArray(units)) {
        units.forEach((unit) => {
            stats.survivability +=
                (unit["Armor"] || 0) +
                (unit["HP"] || 0) +
                (unit["Morale"] || 0) +
                (unit["Missile Block Chance"] || 0) +
                (unit["Melee Defense"] || 0);

            stats.melee_strength +=
                (unit["Melee Attack"] || 0) +
                (unit["Base Damage"] || 0) +
                (unit["Charge Bonus"] || 0) +
                (unit["AP Damage"] || 0) +
                (unit["Bonus vs Infantry"] || 0);

            if ((unit["Range"] ?? 0) > 80) {
                stats.ranged_strength +=
                    (unit["Base Missile Damage"] || 0) +
                    (unit["Accuracy"] || 0) +
                    (unit["AP Missile Damage"] || 0) +
                    (unit["Range"] || 0) +
                    (unit["Ammo"] || 0);
                missileUnitsCount++;
            }

            if (unit["Class"] && ["Shock Cavalry", "Melee Cavalry"].includes(unit["Class"])) {
                stats.cavalry_prowess +=
                    (unit["Charge Bonus"] || 0) +
                    (unit["Melee Attack"] || 0) +
                    (unit["Armor"] || 0);
                cavalryUnitsCount++;
            }

            if ((unit["Range"] ?? 0) > 0 && (unit["Range"] ?? 0) <= 80) {
                stats.pilla_prowess +=
                    (unit["Missile Damage"] || 0) +
                    (unit["AP Damage"] || 0) +
                    (unit["Ammo"] || 0);
                pillaUnitsCount++;
            }
        });
    } else {
        console.error('units is not an array:', units);
    }

    const totalUnits = units.length || 1;
    const modifier = factionModifiers || {
        survivability: 1,
        melee_strength: 1,
        ranged_strength: 1,
        cavalry_prowess: 1,
        pilla_prowess: 1,
    };

    const finalStats: FactionStats = {
        survivability: parseFloat(((stats.survivability / totalUnits) * modifier.survivability).toFixed(2)),
        melee_strength: parseFloat(((stats.melee_strength / totalUnits) * modifier.melee_strength).toFixed(2)),
        ranged_strength: missileUnitsCount
            ? parseFloat(((stats.ranged_strength / missileUnitsCount) * modifier.ranged_strength).toFixed(2))
            : 0,
        cavalry_prowess: cavalryUnitsCount
            ? parseFloat(((stats.cavalry_prowess / cavalryUnitsCount) * modifier.cavalry_prowess).toFixed(2))
            : 0,
        pilla_prowess: pillaUnitsCount
            ? parseFloat(((stats.pilla_prowess / pillaUnitsCount) * modifier.pilla_prowess).toFixed(2))
            : 0,
        total_strength: 0,
        tier: "",
    };

    finalStats.total_strength =
        finalStats.survivability +
        finalStats.melee_strength +
        finalStats.ranged_strength +
        finalStats.cavalry_prowess +
        finalStats.pilla_prowess;

    if (finalStats.total_strength > 1000) {
        finalStats.tier = "S";
    } else if (finalStats.total_strength > 500) {
        finalStats.tier = "A";
    } else if (finalStats.total_strength > 250) {
        finalStats.tier = "B";
    } else {
        finalStats.tier = "C";
    }

    return finalStats;
};

export const calculateAllFactionStats = (): Record<string, FactionStats> => {
    const allFactionStats: Record<string, FactionStats> = {};
    const unitsByFaction = groupUnitsByFaction(unitsStatsDataJson);

    for (const [factionName, units] of Object.entries(unitsByFaction)) {
        const factionModifiers = factionModifiersDataJson[factionName] || {
            survivability: 1,
            melee_strength: 1,
            ranged_strength: 1,
            cavalry_prowess: 1,
            pilla_prowess: 1,
        };

        const stats = calculateFactionStats(units as Unit[], factionModifiers);
        allFactionStats[factionName] = stats;
    }

    return allFactionStats;
};

const allStats = calculateAllFactionStats();
console.log(allStats);
