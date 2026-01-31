// ai-personality-config.js
const AI_PERSONALITIES = {
    "aggressive_attacker": {
        name: "Aggressive Attacker",
        description: "Prioritizes attacking opponent gaps over own development",
        
        // Priority multipliers (1.0 = normal, >1.0 = higher priority, <1.0 = lower)
        priorities: {
            gapThreat: 1.0,        // Emergency gap filling (always highest)
            criticalAttack: 1.5,   // Attacking opponent gaps
            standardAttack: 1.3,
            opportunisticAttack: 1.2,
            borderConnection: 0.8,  // Less focused on borders
            chainExtension: 0.7,    // Less focused on own development
            safeGapFilling: 0.9
        },
        
        // Decision randomization (0.0 = deterministic, 1.0 = maximum chaos)
        randomization: {
            startingPosition: 0.3,  // Some variety in starting moves
            moveSelection: 0.2,     // Slight randomness in equal-priority moves
            headSelection: 0.4,     // More random head selection
            lPatternChoice: 0.3     // Variety in L-pattern directions
        },
        
        // Strategic preferences
        strategy: {
            attackThreshold: 2500,     // Lower threshold for attacks (more aggressive)
            defensiveReactivity: 0.8,  // How much to react to opponent threats
            independentPlaying: 0.3,   // Tendency to ignore opponent and focus on own chain
            riskTaking: 0.7           // Willingness to take strategic risks
        },
        
        // Starting position preferences
        startingArea: {
            centerWeight: 0.6,      // Less preference for exact center
            rowRange: [5, 9],       // Rows 5-9 acceptable
            colRange: [5, 9],       // Cols 5-9 acceptable
            avoidEdges: true        // Don't start near edges
        }
    },
    
    "defensive_builder": {
        name: "Defensive Builder", 
        description: "Focuses on chain development and gap protection",
        
        priorities: {
            gapThreat: 1.0,
            criticalAttack: 0.8,    // Less aggressive attacking
            standardAttack: 0.6,
            opportunisticAttack: 0.4,
            borderConnection: 1.2,   // More focused on completion
            chainExtension: 1.3,     // Strong chain development
            safeGapFilling: 1.1
        },
        
        randomization: {
            startingPosition: 0.1,   // Prefers consistent starts
            moveSelection: 0.1,      // More deterministic
            headSelection: 0.2,      // Consistent head management
            lPatternChoice: 0.2
        },
        
        strategy: {
            attackThreshold: 4000,   // Higher threshold (less aggressive)
            defensiveReactivity: 1.2, // Very reactive to threats
            independentPlaying: 0.7,  // More independent play
            riskTaking: 0.3          // Conservative
        },
        
        startingArea: {
            centerWeight: 0.9,       // Strong center preference
            rowRange: [6, 8],        // Narrow range
            colRange: [6, 8],
            avoidEdges: true
        }
    },
    
    "chaotic_experimenter": {
        name: "Chaotic Experimenter",
        description: "Unpredictable with high variability in decisions",
        
        priorities: {
            gapThreat: 1.0,          // Still handles emergencies
            criticalAttack: 1.0,     // Normal attack priorities
            standardAttack: 1.0,
            opportunisticAttack: 1.0,
            borderConnection: 1.0,
            chainExtension: 1.0,
            safeGapFilling: 1.0
        },
        
        randomization: {
            startingPosition: 0.8,   // High starting variety
            moveSelection: 0.6,      // Significant move randomness
            headSelection: 0.7,      // Random head choices
            lPatternChoice: 0.8      // High pattern variety
        },
        
        strategy: {
            attackThreshold: 3500,   // Moderate attack threshold
            defensiveReactivity: 0.5, // Sometimes ignores threats
            independentPlaying: 0.8,  // Mostly independent
            riskTaking: 0.9          // High risk tolerance
        },
        
        startingArea: {
            centerWeight: 0.2,       // Low center preference
            rowRange: [4, 10],       // Wide starting area
            colRange: [4, 10],
            avoidEdges: false        // Can start near edges
        }
    }
};