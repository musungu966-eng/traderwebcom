"use client";

import React, { useState, useEffect, useRef } from "react";

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const MY_AFFILIATE_LINK = "https://track.deriv.com/_your_affiliate_id_here/";
const DERIV_APP_ID = "1089"; // Replace with your Deriv App ID if needed
const ADMIN_PASSWORD = "admin123password"; // Set your desired admin password

const SYMBOLS = [
  { symbol: "R_100", display_name: "Volatility 100 Index" },
  { symbol: "R_50", display_name: "Volatility 50 Index" },
  { symbol: "R_25", display_name: "Volatility 25 Index" },
  { symbol: "1HZ10V", display_name: "Volatility 10 (1s) Index" },
];

export default function TraderWeb() {
  // State
  const [token, setToken] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [selectedSymbol, setSelectedSymbol] = useState("R_100");
  const [amount, setAmount] = useState<number>(10);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [isTrading, setIsTrading] = useState(false);

  // Admin View State
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminError, setAdminError] = useState("");

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Helper: Sanitize & Clean Token (e.g., handles "pat_" prefixes or extra spaces)
  const sanitizeToken = (rawToken: string): string => {
    return rawToken.trim().replace(/^pat_/i, "").replace(/[^a-zA-Z0-9]/g, "");
  };

  // Initialize WebSocket Connection
  useEffect(() => {
    const ws = new WebSocket(
      `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to Deriv WebSocket");
      // Check local storage for previously saved token
      const savedToken = localStorage.getItem("deriv_token");
      if (savedToken) {
        setToken(savedToken);
        authorizeToken(savedToken);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.msg_type === "authorize") {
        if (data.error) {
          setTradeStatus(`Authorization failed: ${data.error.message}`);
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
          setBalance(data.authorize.balance);
          setCurrency(data.authorize.currency);
          setTradeStatus("Connected and Authorized successfully.");
          // Subscribe to ongoing balance updates
          ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        }
      }

      if (data.msg_type === "balance") {
        if (data.balance) {
          setBalance(data.balance.balance);
        }
      }

      if (data.msg_type === "buy") {
        setIsTrading(false);
        if (data.error) {
          setTradeStatus(`Trade Error: ${data.error.message}`);
        } else {
          setTradeStatus(
            `Trade placed successfully! Contract ID: ${data.buy.contract_id}`
          );
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setTradeStatus("WebSocket connection error.");
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    return () => {
      ws.close();
    };
  }, []);

  // Send Authorization Request
  const authorizeToken = (rawToken: string) => {
    const cleanToken = sanitizeToken(rawToken);
    if (!cleanToken) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setTradeStatus("Authorizing token...");
      wsRef.current.send(JSON.stringify({ authorize: cleanToken }));
      localStorage.setItem("deriv_token", cleanToken);
    } else {
      setTradeStatus("WebSocket not connected yet. Try again in a moment.");
    }
  };

  // Connect Token Event Handler
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    authorizeToken(token);
  };

  // Disconnect Token
  const handleDisconnect = () => {
    localStorage.removeItem("deriv_token");
    setToken("");
    setIsAuthorized(false);
    setBalance(null);
    setTradeStatus("Disconnected.");
  };

  // Handle Contract Purchase (CALL / PUT)
  const handleTrade = (contractType: "CALL" | "PUT") => {
    if (!isAuthorized) {
      setTradeStatus("Please connect your API token first.");
      return;
    }

    if (amount <= 0) {
      setTradeStatus("Please enter a valid stake amount.");
      return;
    }

    setIsTrading(true);
    setTradeStatus(`Placing ${contractType} trade...`);

    const buyRequest = {
      buy: 1,
      price: amount,
      parameters: {
        amount: amount,
        basis: "stake",
        contract_type: contractType,
        currency: currency,
        duration: 5,
        duration_unit: "t", // 5 Ticks
        symbol: selectedSymbol,
      },
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(buyRequest));
    } else {
      setIsTrading(false);
      setTradeStatus("Connection lost. Reconnect and try again.");
    }
  };

  // Admin View Authentication
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setAdminError("");
    } else {
      setAdminError("Incorrect password.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-red-600 rounded flex items-center justify-center font-bold text-white text-lg">
            T
          </div>
          <span className="text-xl font-extrabold tracking-wider text-white">
            TRADER<span className="text-red-600">WEB</span>
          </span>
        </div>

        {/* Affiliate Button */}
        <a
          href={MY_AFFILIATE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-red-600/30"
        >
          Open Deriv Account
        </a>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: API Token & Account Balance */}
        <div className="space-y-6">
          {/* API Connection Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Deriv API Token
            </h2>

            {!isAuthorized ? (
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    API Token (Cleans `pat_` automatically)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Deriv Token..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  Connect Account
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-xs text-emerald-400 flex justify-between items-center">
                  <span>Connected to Deriv API</span>
                  <span className="font-mono text-emerald-300">● Live</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg text-xs transition"
                >
                  Disconnect Token
                </button>
              </div>
            )}
          </div>

          {/* Balance Display Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
              Account Balance
            </h3>
            <div className="text-3xl font-extrabold text-white font-mono">
              {balance !== null
                ? `${balance.toFixed(2)} ${currency}`
                : "---.-- USD"}
            </div>
          </div>
        </div>

        {/* Middle Column: Trading Console */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">
              Trade Execution
            </h2>

            {/* Market Selector */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2 font-medium">
                Select Market
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SYMBOLS.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => setSelectedSymbol(s.symbol)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition ${
                      selectedSymbol === s.symbol
                        ? "bg-red-600/20 border-red-600 text-red-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {s.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Stake Amount Input */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2 font-medium">
                Stake Amount ({currency})
              </label>
              <input
                type="number"
                min="0.35"
                step="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-lg font-mono text-white focus:outline-none focus:border-red-600 transition"
              />
            </div>

            {/* CALL / PUT Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => handleTrade("CALL")}
                disabled={!isAuthorized || isTrading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-[0.98] flex flex-col items-center justify-center gap-1"
              >
                <span className="text-lg">HIGHER / CALL</span>
                <span className="text-xs font-normal text-emerald-200">
                  Rise in 5 Ticks
                </span>
              </button>

              <button
                onClick={() => handleTrade("PUT")}
                disabled={!isAuthorized || isTrading}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-[0.98] flex flex-col items-center justify-center gap-1"
              >
                <span className="text-lg">LOWER / PUT</span>
                <span className="text-xs font-normal text-rose-200">
                  Fall in 5 Ticks
                </span>
              </button>
            </div>

            {/* Trade Status Console Log */}
            {tradeStatus && (
              <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300">
                <span className="text-zinc-500 mr-2">&gt;</span>
                {tradeStatus}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Admin Dashboard View */}
        <div className="md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl mt-4">
          <h2 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">
            Admin Area
          </h2>

          {!isAdminLoggedIn ? (
            <form
              onSubmit={handleAdminLogin}
              className="flex flex-col sm:flex-row gap-3 max-w-md"
            >
              <input
                type="password"
                placeholder="Enter Admin Password..."
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-600 flex-1"
              />
              <button
                type="submit"
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-6 py-2 rounded-lg text-sm transition"
              >
                Access Admin
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-emerald-400 font-semibold">
                  ✓ Admin Dashboard Active
                </p>
                <button
                  onClick={() => setIsAdminLoggedIn(false)}
                  className="text-xs text-zinc-400 hover:text-white underline"
                >
                  Log Out
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-500 block mb-1">
                    Current Symbol
                  </span>
                  <span className="text-white font-bold text-sm">
                    {selectedSymbol}
                  </span>
                </div>
                <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-500 block mb-1">
                    Affiliate Target
                  </span>
                  <a
                    href={MY_AFFILIATE_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-400 truncate block hover:underline"
                  >
                    {MY_AFFILIATE_LINK}
                  </a>
                </div>
                <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-500 block mb-1">
                    App ID Config
                  </span>
                  <span className="text-white font-bold text-sm">
                    {DERIV_APP_ID}
                  </span>
                </div>
              </div>
            </div>
          )}

          {adminError && (
            <p className="text-xs text-rose-500 mt-2">{adminError}</p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        TraderWeb Platform &copy; {new Date().getFullYear()} — Built for
        Fast Execution.
      </footer>
    </div>
  );
}
