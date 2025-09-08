// direction-config.js - Complete with Pattern Validation
const DIRECTION_CONFIGS = {
  vertical: {
    direction: 'vertical',
    primaryAxis: 'row',
    secondaryAxis: 'col',
    startEdge: 0,
    endEdge: (size) => size - 1,
    
    // Pattern definitions for L/I validation
    patternDefinitions: {
      L: [
        {dr: 1, dc: 2}, {dr: 1, dc: -2}, {dr: -1, dc: 2}, {dr: -1, dc: -2},
        {dr: 2, dc: 1}, {dr: 2, dc: -1}, {dr: -2, dc: 1}, {dr: -2, dc: -1}
      ],
      I: [
        {dr: 0, dc: 2}, {dr: 0, dc: -2}, {dr: 2, dc: 0}, {dr: -2, dc: 0},
        {dr: 2, dc: 2}, {dr: 2, dc: -2}, {dr: -2, dc: 2}, {dr: -2, dc: -2}
      ]
    },
    
    // CRITICAL: Add the missing isValidPattern method
    isValidPattern: function(dr, dc) {
      const {L, I} = this.patternDefinitions;
      return [...L, ...I].some(pattern => 
        pattern.dr === dr && pattern.dc === dc
      );
    },
    
    phaseThreshold: 7,
    
    // Existing methods
    getEdgePosition: (piece) => piece.row,
    getSpanPosition: (piece) => piece.col,
    createPosition: (primary, secondary) => ({ row: primary, col: secondary }),
    getSpan: (chain) => {
      const positions = chain.map(p => p.col);
      return Math.max(...positions) - Math.min(...positions) + 1;
    },
    getProgress: (chain, size) => {
      if (chain.length === 0) return 0;
      const positions = chain.map(p => p.row);
      const minPos = Math.min(...positions);
      const maxPos = Math.max(...positions);
      return ((maxPos - minPos + 1) / size) * 100;
    }
  },
  
  horizontal: {
    direction: 'horizontal',
    primaryAxis: 'col',
    secondaryAxis: 'row',
    startEdge: 0,
    endEdge: (size) => size - 1,
    
    // Same pattern definitions for horizontal
    patternDefinitions: {
      L: [
        {dr: 1, dc: 2}, {dr: 1, dc: -2}, {dr: -1, dc: 2}, {dr: -1, dc: -2},
        {dr: 2, dc: 1}, {dr: 2, dc: -1}, {dr: -2, dc: 1}, {dr: -2, dc: -1}
      ],
      I: [
        {dr: 0, dc: 2}, {dr: 0, dc: -2}, {dr: 2, dc: 0}, {dr: -2, dc: 0},
        {dr: 2, dc: 2}, {dr: 2, dc: -2}, {dr: -2, dc: 2}, {dr: -2, dc: -2}
      ]
    },
    
    // CRITICAL: Add the missing isValidPattern method
    isValidPattern: function(dr, dc) {
      const {L, I} = this.patternDefinitions;
      return [...L, ...I].some(pattern => 
        pattern.dr === dr && pattern.dc === dc
      );
    },
    
    phaseThreshold: 7,
    
    // Existing methods
    getEdgePosition: (piece) => piece.col,
    getSpanPosition: (piece) => piece.row,
    createPosition: (primary, secondary) => ({ row: secondary, col: primary }),
    getSpan: (chain) => {
      const positions = chain.map(p => p.row);
      return Math.max(...positions) - Math.min(...positions) + 1;
    },
    getProgress: (chain, size) => {
      if (chain.length === 0) return 0;
      const positions = chain.map(p => p.col);
      const minPos = Math.min(...positions);
      const maxPos = Math.max(...positions);
      return ((maxPos - minPos + 1) / size) * 100;
    }
  }
};

function getDirectionConfig(player) {
  return player === 'X' ? DIRECTION_CONFIGS.vertical : DIRECTION_CONFIGS.horizontal;
}

// Export for browser environment
if (typeof window !== 'undefined') {
  window.DIRECTION_CONFIGS = DIRECTION_CONFIGS;
  window.getDirectionConfig = getDirectionConfig;
}

console.log('✅ direction-config.js with pattern validation loaded');