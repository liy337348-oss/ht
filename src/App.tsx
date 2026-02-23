/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Hand, 
  Layers, 
  ChevronRight, 
  Info,
  AlertCircle,
  Play,
  Gamepad2,
  HelpCircle,
  Languages
} from 'lucide-react';
import { Card, Suit, GameState, GameStatus } from './types';
import { 
  createDeck, 
  isValidMove, 
  SUIT_SYMBOLS, 
  SUIT_COLORS, 
  SUITS 
} from './constants';
import { Language, translations } from './i18n';

interface CardComponentProps {
  card?: Card;
  isFaceDown?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CardComponent: React.FC<CardComponentProps> = ({ 
  card, 
  isFaceDown = false, 
  onClick, 
  isPlayable = false,
  className = "",
  style = {}
}) => {
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20 }}
      whileHover={isPlayable ? { y: -10, scale: 1.05 } : {}}
      onClick={onClick}
      style={style}
      className={`relative w-24 h-36 sm:w-28 sm:h-40 rounded-xl shadow-lg cursor-pointer transition-shadow duration-200 
        ${isFaceDown ? 'bg-indigo-800 border-4 border-white' : 'bg-white border border-gray-200'}
        ${isPlayable ? 'ring-4 ring-yellow-400 shadow-yellow-200/50' : ''}
        ${className}`}
    >
      {isFaceDown ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-24 border-2 border-white/20 rounded-lg flex items-center justify-center">
            <Layers className="text-white/40 w-8 h-8" />
          </div>
        </div>
      ) : card ? (
        <div className={`p-2 h-full flex flex-col justify-between ${SUIT_COLORS[card.suit]}`}>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xl font-bold">{card.rank}</span>
            <span className="text-lg">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
          <div className="text-4xl self-center">{SUIT_SYMBOLS[card.suit]}</div>
          <div className="flex flex-col items-end leading-none rotate-180">
            <span className="text-xl font-bold">{card.rank}</span>
            <span className="text-lg">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

export default function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showSuitSelector, setShowSuitSelector] = useState(false);
  const [pendingEightCard, setPendingEightCard] = useState<Card | null>(null);

  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const initGame = useCallback(() => {
    const deck = createDeck();
    const playerHand = deck.splice(0, 8);
    const aiHand = deck.splice(0, 8);
    
    // Ensure the first discard is not an 8 for simplicity
    let firstDiscardIndex = 0;
    while (deck[firstDiscardIndex].rank === '8') {
      firstDiscardIndex++;
    }
    const discardPile = [deck.splice(firstDiscardIndex, 1)[0]];

    setGameState({
      deck,
      discardPile,
      playerHand,
      aiHand,
      currentTurn: 'player',
      status: 'playing',
      declaredSuit: null,
      lastAction: translations[language].gameStarted,
    });
    setShowSuitSelector(false);
    setPendingEightCard(null);
  }, [language]);

  const goToMenu = useCallback(() => {
    setGameState({
      deck: [],
      discardPile: [],
      playerHand: [],
      aiHand: [],
      currentTurn: 'player',
      status: 'menu',
      declaredSuit: null,
      lastAction: '',
    });
  }, []);

  // Initialize with menu state
  useEffect(() => {
    goToMenu();
  }, [goToMenu]);

  const topCard = useMemo(() => {
    if (!gameState) return null;
    return gameState.discardPile[gameState.discardPile.length - 1];
  }, [gameState]);

  const checkWinner = useCallback((state: GameState) => {
    if (state.playerHand.length === 0) return 'player_won';
    if (state.aiHand.length === 0) return 'ai_won';
    return 'playing';
  }, []);

  const checkDraw = useCallback((state: GameState) => {
    if (state.deck.length > 0) return false;
    
    const top = state.discardPile[state.discardPile.length - 1];
    const playerCanMove = state.playerHand.some(c => isValidMove(c, top, state.declaredSuit));
    const aiCanMove = state.aiHand.some(c => isValidMove(c, top, state.declaredSuit));
    
    return !playerCanMove && !aiCanMove;
  }, []);

  const handleDraw = useCallback(() => {
    if (!gameState || gameState.currentTurn !== 'player' || gameState.status !== 'playing') return;

    const newDeck = [...gameState.deck];
    const newPlayerHand = [...gameState.playerHand];
    
    if (newDeck.length > 0) {
      const drawnCard = newDeck.pop()!;
      newPlayerHand.push(drawnCard);
      
      const newState: GameState = {
        ...gameState,
        deck: newDeck,
        playerHand: newPlayerHand,
        currentTurn: 'ai',
        lastAction: t.youDrew,
      };
      
      // Check if drawing led to a draw state (unlikely but possible if deck was 1 card)
      if (checkDraw(newState)) {
        newState.status = 'draw';
      }
      
      setGameState(newState);
    } else {
      // Skip turn if deck is empty
      const newState: GameState = {
        ...gameState,
        currentTurn: 'ai',
        lastAction: t.deckEmpty,
      };
      
      if (checkDraw(newState)) {
        newState.status = 'draw';
      }
      
      setGameState(newState);
    }
  }, [gameState, t, checkDraw]);

  const playCard = useCallback((card: Card, isPlayer: boolean, chosenSuit?: Suit) => {
    if (!gameState) return;

    const hand = isPlayer ? [...gameState.playerHand] : [...gameState.aiHand];
    const newHand = hand.filter(c => c.id !== card.id);
    const newDiscardPile = [card];
    
    const nextTurn = isPlayer ? 'ai' : 'player';
    let status = gameState.status;
    
    if (newHand.length === 0) {
      status = isPlayer ? 'player_won' : 'ai_won';
    }

    const actionPrefix = isPlayer ? t.youPlayed : t.aiPlayed;
    const suitName = chosenSuit ? (t as any)[chosenSuit] : '';
    const actionMsg = `${actionPrefix} ${card.rank} of ${(t as any)[card.suit]}${card.rank === '8' ? `${t.suitChanged} ${suitName}!` : ''}`;

    const newState: GameState = {
      ...gameState,
      discardPile: newDiscardPile,
      [isPlayer ? 'playerHand' : 'aiHand']: newHand,
      currentTurn: status === 'playing' ? nextTurn : gameState.currentTurn,
      status,
      declaredSuit: card.rank === '8' ? (chosenSuit || null) : null,
      lastAction: actionMsg,
    };

    setGameState(newState);
  }, [gameState, t]);

  const handlePlayerPlay = (card: Card) => {
    if (!gameState || gameState.currentTurn !== 'player' || gameState.status !== 'playing') return;

    if (isValidMove(card, topCard!, gameState.declaredSuit)) {
      if (card.rank === '8') {
        setPendingEightCard(card);
        setShowSuitSelector(true);
      } else {
        playCard(card, true);
      }
    }
  };

  const handleSuitSelect = (suit: Suit) => {
    if (pendingEightCard) {
      playCard(pendingEightCard, true, suit);
      setPendingEightCard(null);
      setShowSuitSelector(false);
    }
  };

  // AI Logic
  useEffect(() => {
    if (gameState?.currentTurn === 'ai' && gameState.status === 'playing') {
      const timer = setTimeout(() => {
        const playableCards = gameState.aiHand.filter(c => 
          isValidMove(c, topCard!, gameState.declaredSuit)
        );

        if (playableCards.length > 0) {
          // AI Strategy: Play an 8 if it's the only option or randomly
          const nonEight = playableCards.find(c => c.rank !== '8');
          const cardToPlay = nonEight || playableCards[0];
          
          if (cardToPlay.rank === '8') {
            // AI chooses suit it has most of
            const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
            gameState.aiHand.forEach(c => suitCounts[c.suit]++);
            const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => 
              suitCounts[a] > suitCounts[b] ? a : b
            );
            playCard(cardToPlay, false, bestSuit);
          } else {
            playCard(cardToPlay, false);
          }
        } else {
          // AI must draw
          const newDeck = [...gameState.deck];
          if (newDeck.length > 0) {
            const drawnCard = newDeck.pop()!;
            const newAiHand = [...gameState.aiHand, drawnCard];
            setGameState({
              ...gameState,
              deck: newDeck,
              aiHand: newAiHand,
              currentTurn: 'player',
              lastAction: t.aiDrew,
            });
          } else {
            const newState: GameState = {
              ...gameState,
              currentTurn: 'player',
              lastAction: t.aiSkipped,
            };
            if (checkDraw(newState)) {
              newState.status = 'draw';
            }
            setGameState(newState);
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState, topCard, playCard, t, checkDraw]);

  if (!gameState) return null;

  if (gameState.status === 'menu') {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Cards */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: window.innerHeight + 200,
                rotate: Math.random() * 360 
              }}
              animate={{ 
                y: -200,
                rotate: Math.random() * 360 
              }}
              transition={{ 
                duration: 10 + Math.random() * 20, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 10
              }}
              className="absolute"
            >
              <CardComponent isFaceDown className="scale-75" />
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center max-w-2xl"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-400 rounded-[2rem] shadow-2xl shadow-yellow-400/20 mb-8 rotate-12">
            <Gamepad2 className="text-emerald-950 w-12 h-12" />
          </div>
          
          <h1 className="text-6xl sm:text-8xl font-black text-white mb-4 tracking-tighter">
            {language === 'zh' ? (
              <>华天狂野 <span className="text-yellow-400">8点</span></>
            ) : (
              <>CRAZY <span className="text-yellow-400">8S</span></>
            )}
          </h1>
          <p className="text-emerald-300/60 text-lg sm:text-xl mb-12 font-medium uppercase tracking-[0.2em]">
            {t.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={initGame}
              className="group relative px-12 py-5 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 rounded-2xl font-black text-xl shadow-2xl shadow-yellow-400/20 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Play className="w-6 h-6 fill-current" />
              {t.startGame}
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={toggleLanguage}
              className="px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 active:scale-95 border border-white/10"
            >
              <Languages className="w-6 h-6" />
              {language === 'zh' ? 'English' : '中文'}
            </button>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
              <Layers className="text-yellow-400 w-6 h-6 mb-3" />
              <h3 className="font-bold text-white mb-1">{t.matchRules}</h3>
              <p className="text-sm text-emerald-300/60">{t.matchRulesDesc}</p>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
              <RotateCcw className="text-yellow-400 w-6 h-6 mb-3" />
              <h3 className="font-bold text-white mb-1">{t.eightIsWild}</h3>
              <p className="text-sm text-emerald-300/60">{t.eightWildDesc}</p>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
              <Trophy className="text-yellow-400 w-6 h-6 mb-3" />
              <h3 className="font-bold text-white mb-1">{t.winCondition}</h3>
              <p className="text-sm text-emerald-300/60">{t.winConditionDesc}</p>
            </div>
          </div>
        </motion.div>

        <footer className="absolute bottom-8 text-emerald-300/30 text-xs font-mono uppercase tracking-widest">
          {language === 'zh' ? '华天' : 'HT'} &bull; 2024
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-900 text-white font-sans selection:bg-emerald-500 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
            <Layers className="text-emerald-900 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-xs text-emerald-300/70 font-mono uppercase tracking-widest">{t.standardRules}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <Info className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-100">{t.eightIsWild}</span>
          </div>
          <button 
            onClick={toggleLanguage}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-emerald-300"
            title="Switch Language"
          >
            <Languages className="w-5 h-5" />
          </button>
          <button 
            onClick={goToMenu}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-emerald-300"
            title={t.backToMenu}
          >
            <Gamepad2 className="w-5 h-5" />
          </button>
          <button 
            onClick={initGame}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title={t.resetGame}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative p-4 flex flex-col items-center justify-between max-w-6xl mx-auto w-full">
        
        {/* AI Hand */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
            <div className={`w-2 h-2 rounded-full ${gameState.currentTurn === 'ai' ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'}`} />
            {t.aiOpponent} ({gameState.aiHand.length} {t.cards})
          </div>
          <div className="w-full max-w-4xl overflow-x-auto no-scrollbar py-2 px-4">
            <div className="flex justify-center -space-x-10 sm:-space-x-14 min-w-max">
              {gameState.aiHand.map((_, i) => (
                <CardComponent key={`ai-${i}`} isFaceDown className="transition-transform hover:z-10" />
              ))}
            </div>
          </div>
        </div>

        {/* Center Table */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 my-8">
          {/* Draw Pile */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group" onClick={handleDraw}>
              <div className="absolute -inset-1 bg-yellow-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <CardComponent 
                isFaceDown 
                className={`relative ${gameState.currentTurn === 'player' ? 'hover:scale-105 active:scale-95' : 'opacity-80'}`} 
              />
              <div className="absolute -top-3 -right-3 bg-indigo-600 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                {gameState.deck.length}
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-tighter">{t.drawPile}</span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <CardComponent card={topCard!} className="relative z-10" />
              
              {gameState.declaredSuit && (
                <div className="absolute -top-4 -left-4 z-20 bg-white rounded-full p-2 shadow-xl border-2 border-emerald-500 animate-bounce">
                  <span className={`text-2xl ${SUIT_COLORS[gameState.declaredSuit]}`}>
                    {SUIT_SYMBOLS[gameState.declaredSuit]}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-tighter">{t.discardPile}</span>
          </div>
        </div>

        {/* Status Message */}
        <div className="absolute left-4 bottom-1/2 translate-y-1/2 hidden lg:flex flex-col gap-2 max-w-[200px]">
          <div className="p-4 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold uppercase text-white/60">{t.log}</span>
            </div>
            <p className="text-sm text-emerald-100 leading-relaxed italic">
              "{gameState.lastAction}"
            </p>
          </div>
        </div>

        {/* Player Hand */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
            <div className={`w-2 h-2 rounded-full ${gameState.currentTurn === 'player' ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'}`} />
            {t.yourHand} ({gameState.playerHand.length} {t.cards})
          </div>
          
          <div className="w-full max-w-4xl overflow-x-auto no-scrollbar pb-8 px-4">
            <div className="flex justify-center -space-x-8 sm:-space-x-12 min-w-max">
              <AnimatePresence>
                {gameState.playerHand.map((card) => (
                  <CardComponent 
                    key={card.id} 
                    card={card} 
                    isPlayable={gameState.currentTurn === 'player' && isValidMove(card, topCard!, gameState.declaredSuit)}
                    onClick={() => handlePlayerPlay(card)}
                    className="hover:z-50 transition-all"
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Status Bar */}
      <div className="lg:hidden p-3 bg-black/40 text-center text-sm italic text-emerald-100 border-t border-white/10">
        {gameState.lastAction}
      </div>

      {/* Suit Selector Modal */}
      <AnimatePresence>
        {showSuitSelector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-emerald-950 border border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
            >
              <h2 className="text-2xl font-bold mb-2">{t.crazyEight}</h2>
              <p className="text-emerald-400/70 mb-8">{t.chooseSuit}</p>
              
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelect(suit)}
                    className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                  >
                    <span className={`text-5xl group-hover:scale-125 transition-transform ${SUIT_COLORS[suit]}`}>
                      {SUIT_SYMBOLS[suit]}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">{(t as any)[suit]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState.status !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gradient-to-b from-emerald-900 to-emerald-950 border border-white/20 rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl text-center relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400" />
              
              <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-yellow-400 rounded-full shadow-yellow-400/20 shadow-2xl">
                <Trophy className="text-emerald-950 w-12 h-12" />
              </div>
              
              <h2 className="text-5xl font-black mb-4 tracking-tight">
                {gameState.status === 'player_won' ? t.victory : 
                 gameState.status === 'ai_won' ? t.defeat : t.draw}
              </h2>
              
              <p className="text-xl text-emerald-200/80 mb-12 font-medium">
                {gameState.status === 'player_won' ? t.victoryDesc : 
                 gameState.status === 'ai_won' ? t.defeatDesc : t.drawDesc}
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={initGame}
                  className="w-full py-5 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 rounded-2xl font-bold text-lg shadow-xl shadow-yellow-400/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <RotateCcw className="w-6 h-6" />
                  {t.playAgain}
                </button>
                <button
                  onClick={goToMenu}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-md transition-all flex items-center justify-center gap-3 active:scale-95 border border-white/10"
                >
                  <Gamepad2 className="w-5 h-5" />
                  {t.backToMenu}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
