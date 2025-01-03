import { useState, useEffect } from "react";
import { calculateAllFactionStats } from "../calcScript";
import { Toaster } from "react-hot-toast";
import { FactionStats, Faction } from "../types/matchupGeneratorTypes";
import { getPlayerCount, hasValidTortsFaction, calculateTeamScore, calculateFactionScore } from "../utils/utilFunctions";
import { factions } from "./factionList";
import { maps } from "./mapsList";
import { showErrorToast, showSuccessToast } from "../utils/Toast";
import mosaic from "/mosaic.jpg";

const Rome2Generator = () => {
    const [gameType, setGameType] = useState<string>("");
    const [settlementType, setSettlementType] = useState<string>("");
    const [players, setPlayers] = useState<string[]>([]);
    const [teamPercentages, setTeamPercentages] = useState<{ team1: number; team2: number } | null>(null);
    const [usedFactions, setUsedFactions] = useState<string[]>([]);
    const [result, setResult] = useState<{
        map: string;
        teams: Array<Array<{
            player: string;
            faction: string;
            stats: FactionStats;
        }>>;
        teamStrengths: number[];
    } | null>(null);
    const [additionalOptions, setAdditionalOptions] = useState<string[]>([]);
    const [factionStats, setFactionStats] = useState<Record<string, FactionStats>>({});

    useEffect(() => {
        const stats = calculateAllFactionStats();
        setFactionStats(stats);
    }, []);

    const checkAndResetUsedFactions = (requiredFactions: number) => {
        const availableFactions = factions.length - usedFactions.length;
        if (availableFactions < requiredFactions) {
            setUsedFactions([]);
            return true;
        }
        return false;
    };

    const handleGameTypeChange = (value: string) => {
        setGameType(value);
        setPlayers(new Array(getPlayerCount(value)).fill(""));
    };

    const factionsWithStats: Faction[] = factions.map(faction => ({
        ...faction,
        stats: factionStats[faction.name]
    }));

    const calculateTeamStrength = (team: Array<{ faction: string; stats: FactionStats }>) => {
        return team.reduce((sum, member) => {
            const faction = factionsWithStats.find(f => f.name === member.faction);
            return sum + (faction ? calculateFactionScore(faction) : 0);
        }, 0);
    };

    const generateMatchup = (): void => {
        if (players.some(player => player.trim() === "")) {
            showErrorToast("Error: Missing Players", "Please fill in all player fields.");
            return;
        }

        if (!gameType || !settlementType) {
            showErrorToast("Error: Missing Settings", "Please select Battle Type and Map type.");
            return;
        }

        const totalPlayersNeeded = getPlayerCount(gameType);
        const wasReset = checkAndResetUsedFactions(totalPlayersNeeded);
        if (wasReset) {
            showSuccessToast("Faction Pool Reset", "All factions are now available.");
        }

        if (additionalOptions.includes("odkCivilWar")) {
            // ODK Civil War: All players are assigned Odrysian Kingdom
            const teams: [Array<{ player: string; faction: string; stats: FactionStats }>, Array<{ player: string; faction: string; stats: FactionStats }>] = [[], []];
            players.forEach((player, index) => {
                const team = index % 2;
                teams[team].push({
                    player: player || `Player ${index + 1}`,
                    faction: "Odrysian Kingdom",
                    stats: factionStats["Odrysian Kingdom"]
                });
            });

            setResult({
                map: "Any", // ODK Civil War does not depend on the map
                teams,
                teamStrengths: [0, 0] // Strength calculation isn't relevant here
            });
            showSuccessToast("ODK Civil War Generated", "All players have been assigned Odrysian Kingdom.");
            return;
        }

        const eligibleMaps = maps.filter(map => settlementType === "all" || map.type === settlementType);
        const selectedMap = eligibleMaps[Math.floor(Math.random() * eligibleMaps.length)];

        let availableFactions = factionsWithStats.filter(f => !usedFactions.includes(f.name));

        if (selectedMap.requiresTorts) {
            availableFactions = availableFactions.filter(f => f.torts_enabled);
        }
        if (selectedMap.type === 'hellenic' || selectedMap.type === 'barbarian') {
            availableFactions = availableFactions.filter(f => f.type === selectedMap.type);
        }


        // Check if there are enough factions for the matchup
        if (availableFactions.length < totalPlayersNeeded) {
            console.log("Not enough factions, resetting the list...");

            // Reset factions and shuffle again
            availableFactions = factionsWithStats.filter(f => !usedFactions.includes(f.name));
            if (additionalOptions.includes("banSally")) {
                availableFactions = availableFactions.filter(f => f.type !== "sally");
            }
        }

        if (!additionalOptions.includes("balancedMatchup")) {
            const shuffledFactions = [...availableFactions].sort(() => Math.random() - 0.5);
            const teams: [Array<{ player: string; faction: string; stats: FactionStats }>, Array<{ player: string; faction: string; stats: FactionStats }>] = [[], []];
            let playerIndex = 0;

            for (let team = 0; team < 2; team++) {
                for (let i = 0; i < totalPlayersNeeded / 2; i++) {
                    const selectedFaction = shuffledFactions.pop();
                    if (!selectedFaction) continue;

                    teams[team].push({
                        player: players[playerIndex] || `Player ${playerIndex + 1}`,
                        faction: selectedFaction.name,
                        stats: selectedFaction.stats!
                    });
                    playerIndex++;
                }
            }

            // Calculate team strengths even for random matchups
            const team1Score = calculateTeamScore(teams[0].map(member => ({
                name: member.faction,
                type: "",
                torts_enabled: false,
                stats: member.stats
            })));
            const team2Score = calculateTeamScore(teams[1].map(member => ({
                name: member.faction,
                type: "",
                torts_enabled: false,
                stats: member.stats
            })));

            setTeamPercentages({
                team1: (team1Score / (team1Score + team2Score)) * 100,
                team2: (team2Score / (team1Score + team2Score)) * 100
            });

            setResult({
                map: selectedMap.name,
                teams,
                teamStrengths: [team1Score, team2Score]
            });

            showSuccessToast("Random Matchup Generated", "Teams have been generated randomly.");
            return;
        }

        // Default balanced matchup logic
        let attempts = 0;
        const maxAttempts = 100;
        let bestMatchup = null;
        let smallestDifference = Infinity;

        while (attempts < maxAttempts) {
            const teams: Array<Array<{ player: string, faction: string, stats: FactionStats }>> = [[], []];
            const currentMatchupFactions = new Set<string>();
            const playersPerTeam = totalPlayersNeeded / 2;
            let playerIndex = 0;

            for (let team = 0; team < 2; team++) {
                for (let i = 0; i < playersPerTeam; i++) {
                    const validFactions = availableFactions.filter(faction => {
                        if (currentMatchupFactions.has(faction.name)) return false;
                        if (selectedMap.requiresTorts) {
                            availableFactions = availableFactions.filter(faction => faction.torts_enabled);
                        }
                        return settlementType === "all" || faction.type === settlementType;
                    });

                    if (validFactions.length === 0) continue;

                    let selectedFaction: Faction | undefined;

                    if (teams[team].length > 0) {
                        const currentTeamStrength = calculateTeamStrength(teams[team]);
                        const otherTeamStrength = team === 0 ? 0 : calculateTeamStrength(teams[0]);

                        selectedFaction = validFactions.reduce((best, current) => {
                            const bestScore = best ? calculateFactionScore(best) : 0;
                            const currentScore = calculateFactionScore(current);
                            const bestDiff = Math.abs((currentTeamStrength + bestScore) - otherTeamStrength);
                            const currentDiff = Math.abs((currentTeamStrength + currentScore) - otherTeamStrength);
                            return currentDiff < bestDiff ? current : best;
                        });
                    } else {
                        const randomIndex = Math.floor(Math.random() * validFactions.length);
                        selectedFaction = validFactions[randomIndex];
                    }

                    if (!selectedFaction) continue;

                    currentMatchupFactions.add(selectedFaction.name);
                    teams[team].push({
                        player: players[playerIndex] || `Player ${playerIndex + 1}`,
                        faction: selectedFaction.name,
                        stats: selectedFaction.stats!
                    });

                    playerIndex++;
                }
            }

            const teamStrengths = teams.map(calculateTeamStrength);
            const strengthDifference = Math.abs(teamStrengths[0] - teamStrengths[1]);

            if (strengthDifference < smallestDifference &&
                teams[0].length === playersPerTeam &&
                teams[1].length === playersPerTeam &&
                (!selectedMap.requiresTorts || hasValidTortsFaction(teams[0]))) {
                smallestDifference = strengthDifference;
                bestMatchup = {
                    map: selectedMap.name,
                    teams,
                    teamStrengths
                };
            }

            attempts++;
        }

        if (bestMatchup) {
            const newUsedFactions = [...usedFactions];
            bestMatchup.teams.forEach(team => {
                team.forEach(({ faction }) => {
                    if (!newUsedFactions.includes(faction)) {
                        newUsedFactions.push(faction);
                    }
                });
            });
            setUsedFactions(newUsedFactions);
            setResult(bestMatchup);

            const team1Score = calculateTeamScore(bestMatchup.teams[0].map(member => ({
                name: member.faction,
                type: "",
                torts_enabled: false,
                stats: member.stats
            })));
            const team2Score = calculateTeamScore(bestMatchup.teams[1].map(member => ({
                name: member.faction,
                type: "",
                torts_enabled: false,
                stats: member.stats
            })));

            console.log("Team 1 Score:", team1Score);
            console.log("Team 2 Score:", team2Score);

            setTeamPercentages({
                team1: (team1Score / (team1Score + team2Score)) * 100,
                team2: (team2Score / (team1Score + team2Score)) * 100
            });

            showSuccessToast("Matchup Generated", "Teams have been balanced successfully.");
        } else {
            showErrorToast("Generation Failed", "Could not create a balanced matchup. Please try again.");
        }
    };


    return (
        <div className="min-h-screen w-full bg-cover bg-center bg-fixed relative">
            <Toaster
                position="top-center"
            />
            <div
                className="fixed inset-0 bg-cover bg-center z-0"
                style={{ backgroundImage: `url(${mosaic})` }}
            />

            {/* Main Content */}
            <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        {/* Command Center Section */}
                        <div className="backdrop-blur-sm bg-gray-900/75 p-4 sm:p-6 lg:p-8 rounded-lg border-2 border-yellow-600/50 shadow-2xl">
                            <div className="flex items-center mb-6">
                                <div className="h-0.5 flex-grow bg-yellow-600/50"></div>
                                <h2 className="px-4 text-xl sm:text-2xl font-bold text-yellow-300 uppercase tracking-wide drop-shadow">
                                    Battle Information
                                </h2>
                                <div className="h-0.5 flex-grow bg-yellow-600/50"></div>
                            </div>

                            <div className="space-y-6">
                                {/* Game Type Selection */}
                                <div className="space-y-3">
                                    <label className="text-yellow-100/90 text-base sm:text-lg font-semibold">
                                        Battle Type
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            ['1v1', '1v1'],
                                            ['2v2', '2v2'],
                                            ['3v3', '3v3'],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center p-3 bg-gray-800/60 rounded-md border border-yellow-600/30 hover:border-yellow-400/50 transition-colors cursor-pointer group"
                                            >
                                                <input
                                                    type="radio"
                                                    value={value}
                                                    checked={gameType === value}
                                                    onChange={(e) => handleGameTypeChange(e.target.value)}
                                                    className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-600"
                                                />
                                                <span className="ml-2 text-gray-300 group-hover:text-yellow-200 transition-colors text-sm sm:text-base">
                                                    {label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Map Selection */}
                                <div className="space-y-3">
                                    <label className="text-yellow-100/90 text-base sm:text-lg font-semibold">
                                        Map
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            ['all', 'All Maps'],
                                            ['barb', 'Barbarian Maps'],
                                            ['greek', 'Hellenic Maps'],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center p-3 bg-gray-800/60 rounded-md border border-yellow-600/30 hover:border-yellow-400/50 transition-colors cursor-pointer group"
                                            >
                                                <input
                                                    type="radio"
                                                    value={value}
                                                    checked={settlementType === value}
                                                    onChange={(e) => setSettlementType(e.target.value)}
                                                    className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-600"
                                                />
                                                <span className="ml-2 text-gray-300 group-hover:text-yellow-200 transition-colors text-sm sm:text-base">
                                                    {label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Options */}
                                <div className="space-y-3">
                                    <label className="text-yellow-100/90 text-base sm:text-lg font-semibold">
                                        Additional Options
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            ['banSally', 'Ban Sally'],
                                            ['balancedMatchup', 'Balanced Matchup'],
                                            ['odkCivilWar', 'ODK Civil War'],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center p-3 bg-gray-800/60 rounded-md border border-yellow-600/30 hover:border-yellow-400/50 transition-colors cursor-pointer group"
                                            >
                                                <input
                                                    type="checkbox"
                                                    value={value}
                                                    checked={additionalOptions.includes(value)}
                                                    onChange={(e) => {
                                                        const updatedOptions = e.target.checked
                                                            ? [...additionalOptions, value]
                                                            : additionalOptions.filter((option) => option !== value);
                                                        setAdditionalOptions(updatedOptions);
                                                    }}
                                                    className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-600"
                                                />
                                                <span className="ml-2 text-gray-300 group-hover:text-yellow-200 transition-colors text-sm sm:text-base">
                                                    {label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Players Input */}
                                {players.length > 0 && (
                                    <div className="space-y-3 mb-9">
                                        <label className="text-yellow-100/90 text-base sm:text-lg font-semibold">
                                            Commanders
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {players.map((player, index) => (
                                                <input
                                                    key={index}
                                                    type="text"
                                                    placeholder={`Commander ${index + 1}`}
                                                    value={player}
                                                    onChange={(e) => {
                                                        const updatedPlayers = [...players];
                                                        updatedPlayers[index] = e.target.value;
                                                        setPlayers(updatedPlayers);
                                                    }}
                                                    className="w-full p-3 rounded-md bg-gray-800/60 text-gray-200 placeholder-gray-500 border border-yellow-600/30 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Generate Button */}
                                <button
                                    onClick={generateMatchup}
                                    className="w-full mt-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-900 font-bold py-4 px-6 rounded-md uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                                >
                                    Deploy Forces
                                </button>
                            </div>
                        </div>

                        {/* Results Section */}
                        <div className="backdrop-blur-sm bg-gray-900/75 p-4 sm:p-6 lg:p-8 rounded-lg border-2 border-yellow-600/50 shadow-2xl">
                            <div className="flex items-center mb-6">
                                <div className="h-0.5 flex-grow bg-yellow-600/50"></div>
                                <h2 className="px-4 text-xl sm:text-2xl font-bold text-yellow-300 uppercase tracking-wide drop-shadow">
                                    Matchup
                                </h2>
                                <div className="h-0.5 flex-grow bg-yellow-600/50"></div>
                            </div>

                            {result ? (
                                <div className="space-y-6">
                                    <div className="bg-gray-800/60 p-4 rounded-md border border-yellow-600/30 hover:bg-gray-800/70 transition-colors">
                                        <h3 className="text-yellow-300 font-semibold mb-2 drop-shadow">Battlefield</h3>
                                        <p className="text-gray-200">{result.map}</p>
                                    </div>

                                    {result.teams.map((team, index) => (
                                        <div key={index} className="bg-gray-800/60 p-4 rounded-md border border-yellow-600/30 hover:bg-gray-800/70 transition-colors">
                                            <h3 className="text-yellow-300 font-semibold mb-3 drop-shadow">Team {index + 1}</h3>
                                            <div className="space-y-2">
                                                {team.map((member, idx) => (
                                                    <div key={idx} className="bg-gray-700/40 p-3 rounded-md hover:bg-gray-700/50 transition-colors">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-200">{member.player}</span>
                                                            <span className="text-yellow-200">{member.faction}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="bg-gray-800/60 p-4 rounded-md border border-yellow-600/30 hover:bg-gray-800/70 transition-colors">
                                        <h3 className="text-yellow-300 font-semibold mb-3 drop-shadow">Balance of Power</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-gray-200">
                                                <span>Team 1</span>
                                                <span>Team 2</span>
                                            </div>
                                            <div className="h-2 bg-gray-700/60 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: teamPercentages ? `${teamPercentages.team1}%` : '50%'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-400 italic">
                                        Awaiting your command, General...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rome2Generator;
