import React, { useState, useEffect } from "react";
import { MessageCircle, Settings, Globe, Check, X, Clock } from "lucide-react";
import { toast, Toaster } from "sonner";
import type { ExtensionStatus, RecentChat } from "../types/chrome";
import { formatUnits } from "viem";

const Popup: React.FC = () => {
  const [status, setStatus] = useState<ExtensionStatus>({
    enabled: true,
    domain: "Loading...",
    ethAddress: undefined,
    price: undefined,
    decimals: undefined,
    currency: undefined,
  });
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  useEffect(() => {
    loadStatus();
    loadRecentChats();

    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, []);

  const loadStatus = async (): Promise<void> => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getStatus",
      });
      if (response) {
        setStatus(response);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading status:", error);
      toast.error("Failed to load extension status");
      setLoading(false);
    }
  };

  const loadRecentChats = async (): Promise<void> => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getRecentChats",
      });
      if (response && Array.isArray(response.recentChats)) {
        setRecentChats(response.recentChats);
      }
    } catch (error) {
      console.error("Error loading recent chats:", error);
      toast.error("Failed to load recent chats");
    }
  };

  const toggleExtension = async (): Promise<void> => {
    if (isToggling) return;

    setIsToggling(true);
    try {
      await chrome.runtime.sendMessage({ action: "toggleExtension" });
      // Wait a bit for the background script to update
      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadStatus();
      toast.success(
        status.enabled ? "Extension disabled" : "Extension enabled"
      );
    } catch (error) {
      console.error("Error toggling extension:", error);
      toast.error("Failed to toggle extension");
    } finally {
      setIsToggling(false);
    }
  };

  const startChat = async (): Promise<void> => {
    if (!status.domain || !status.ethAddress) {
      toast.error("No valid domain or ETH address found");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: "addToRecentChats",
        domain: status.domain,
        ethAddress: status.ethAddress,
        price: status.price,
        decimals: status.decimals,
        currency: status.currency,
      });

      if (response?.success) {
        await loadRecentChats();
        window.open(`https://nomee.social/messages/${status.domain}`, "_blank");
        toast.success(`Starting chat with ${status.domain}...`);
      } else {
        toast.error("Failed to start connection");
      }
    } catch (error) {
      console.error("Error starting connection:", error);
      toast.error("Failed to start connection");
    }
  };

  const startChatWithDomain = (domain: string): void => {
    window.open(`https://nomee.social/messages/${domain}`, "_blank");
  };

  const blacklistDomain = async (): Promise<void> => {
    if (!status.domain) {
      toast.error("No domain to blacklist");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: "addToBlacklist",
        domain: status.domain,
      });

      if (response?.success) {
        toast.warning(`${status.domain} added to blacklist`);
        // Wait a bit for the background script to update
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadStatus();
      } else {
        toast.error("Failed to blacklist domain");
      }
    } catch (error) {
      console.error("Error blacklisting domain:", error);
      toast.error("Failed to blacklist domain");
    }
  };

  const removeFromRecentChats = async (domain: string): Promise<void> => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "removeFromRecentChats",
        domain: domain,
      });

      if (response?.success) {
        await loadRecentChats();
        toast(`${domain} removed from recent connections`);
      } else {
        toast.error("Failed to remove from recent connections");
      }
    } catch (error) {
      console.error("Error removing from recent connections:", error);
      toast.error("Failed to remove from recent connections");
    }
  };

  const clearRecentChats = async (): Promise<void> => {
    if (recentChats.length === 0) {
      toast("No recent connections to clear");
      return;
    }

    try {
      const promises = recentChats.map((chat) =>
        chrome.runtime.sendMessage({
          action: "removeFromRecentChats",
          domain: chat.domain,
        })
      );

      await Promise.all(promises);
      await loadRecentChats();
      toast("Recent connections cleared");
    } catch (error) {
      console.error("Error clearing recent connections:", error);
      toast.error("Failed to clear recent connections");
    }
  };

  const openSettings = (): void => {
    try {
      chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error("Error opening settings:", error);
      toast.error("Failed to open settings");
    }
  };

  const formatAddress = (address: string | null): string => {
    if (!address) return "";
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatLargeNumber = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return "0";

    const formatWithCap = (val: number, suffix: string = "") => {
      return parseFloat(val.toFixed(6)).toString() + suffix;
    };

    if (num >= 1_000_000_000) {
      return formatWithCap(num / 1_000_000_000, "B");
    } else if (num >= 1_000_000) {
      return formatWithCap(num / 1_000_000, "M");
    } else if (num >= 1_000) {
      return formatWithCap(num / 1_000, "K");
    } else {
      return formatWithCap(num);
    }
  };

  if (loading) {
    return (
      <div className="w-80 h-96 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div
      className={`w-80 relative overflow-hidden transition-all duration-500 ${
        status.enabled
          ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
          : "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"
      }`}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(8px)",
          },
        }}
      />
      {/* Background Pattern */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          status.enabled ? "opacity-10" : "opacity-5"
        }`}
      >
        <div
          className={`absolute inset-0 transition-all duration-500 ${
            status.enabled
              ? "bg-gradient-to-r from-blue-600 to-purple-600"
              : "bg-gradient-to-r from-gray-600 to-gray-500"
          }`}
        ></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent)]"></div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Nomee</h1>
              <p className="text-xs text-gray-300">Connect with owners</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={openSettings}
              className={`p-1.5 rounded-lg transition-colors ${
                status.enabled ? "hover:bg-white/10" : "hover:bg-gray-600/20"
              }`}
              title="Settings"
            >
              <Settings
                className={`w-4 h-4 transition-colors ${
                  status.enabled
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              />
            </button>

            {/* Enhanced Toggle Switch */}
            <div
              onClick={toggleExtension}
              className={`relative inline-flex h-8 w-14 items-center rounded-full cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transform hover:scale-105 ${
                isToggling ? "opacity-50 cursor-not-allowed" : ""
              } ${
                status.enabled
                  ? "bg-gradient-to-r from-green-500 to-blue-500 shadow-lg shadow-blue-500/25"
                  : "bg-gray-600 shadow-lg shadow-gray-600/25"
              }`}
              title={status.enabled ? "Disable Extension" : "Enable Extension"}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                  status.enabled ? "translate-x-7" : "translate-x-1"
                }`}
              ></span>
              <div
                className={`absolute inset-0 rounded-full transition-all duration-300 ${
                  status.enabled
                    ? "bg-gradient-to-r from-green-400/20 to-blue-400/20"
                    : ""
                }`}
              ></div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 p-4 mb-4 animate-fade-in">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">Current Domain</h3>
              <p className="text-xs text-gray-300">
                {status.domain || "No active tab"}
              </p>
            </div>
          </div>

          {!status.enabled ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">
                  Extension Disabled
                </h3>
                <p className="text-xs text-gray-400">
                  Enable to start monitoring domains
                </p>
              </div>
            </div>
          ) : status.ethAddress ? (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">
                    Owner Found
                  </h3>
                  <p className="text-xs text-green-400 font-mono">
                    {formatAddress(status.ethAddress)}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-3 border border-green-500/30">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-sm text-white font-medium">
                    Ready to chat!
                  </span>
                </div>
                <p className="text-xs text-gray-300 mb-3">
                  You can now connect and chat with the website owner through
                  their verified ETH address.
                </p>

                {status.price && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mb-3">
                    <p className="text-xs text-blue-300 text-center">
                      Listed:{" "}
                      <span className="font-bold">
                        {formatLargeNumber(
                          Number(
                            formatUnits(
                              BigInt(status.price),
                              status.decimals ?? 18
                            )
                          )
                        )}{" "}
                        {status.currency}
                      </span>
                    </p>
                  </div>
                )}

                <button
                  onClick={startChat}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Start Connection</span>
                  </div>
                </button>

                <div className="flex items-center justify-center mt-3">
                  <button
                    onClick={blacklistDomain}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center space-x-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Blacklist domain</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">
                  No Owner Found
                </h3>
                <p className="text-xs text-gray-400">
                  This website owner hasn't registered their ETH address
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Connections Section */}
        {recentChats.length > 0 && (
          <div className="backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 p-4 mb-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Recent Connections</span>
              </h3>
              <button
                onClick={clearRecentChats}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentChats.map((chat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {chat.domain}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {formatAddress(chat.ethAddress)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startChatWithDomain(chat.domain)}
                      className="p-1 rounded hover:bg-blue-500/20 text-blue-400"
                      title="Connect"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromRecentChats(chat.domain)}
                      className="p-1 rounded hover:bg-red-500/20 text-red-400"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Secure • Decentralized • Private
          </p>
        </div>
      </div>
    </div>
  );
};

export default Popup;
