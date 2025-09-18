import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  X,
  Trash2,
  Plus,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import ConfirmDialog from "./ConfirmDialog";
import AlertDialog from "./AlertDialog";

const Settings: React.FC = () => {
  const [blacklistedDomains, setBlacklistedDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddingDomain, setIsAddingDomain] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "warning" | "error" | "info" | "success";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    loadBlacklist();
  }, []);

  const loadBlacklist = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await chrome.runtime.sendMessage({
        action: "getBlacklist",
      });
      setBlacklistedDomains(response.blacklistedDomains || []);
    } catch (error) {
      console.error("Error loading blacklist:", error);
      toast.error("Failed to load blacklist");
    } finally {
      setIsLoading(false);
    }
  };

  const addDomain = async (): Promise<void> => {
    if (isAddingDomain) return;

    const domain = domainInput.trim().toLowerCase();

    if (!domain) {
      setAlertDialog({
        isOpen: true,
        title: "Invalid Input",
        message: "Please enter a domain name",
        type: "error",
      });
      return;
    }

    if (!isValidDomain(domain)) {
      setAlertDialog({
        isOpen: true,
        title: "Invalid Domain",
        message: "Please enter a valid domain name (e.g., example.com)",
        type: "error",
      });
      return;
    }

    if (blacklistedDomains.includes(domain)) {
      setAlertDialog({
        isOpen: true,
        title: "Domain Already Exists",
        message: `${domain} is already in the blacklist`,
        type: "warning",
      });
      return;
    }

    setIsAddingDomain(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: "addToBlacklist",
        domain: domain,
      });

      if (response?.success) {
        setDomainInput("");
        await loadBlacklist();
        toast.success(`${domain} added to blacklist`);
      } else {
        toast.error("Failed to add domain to blacklist");
      }
    } catch (error) {
      console.error("Error adding domain to blacklist:", error);
      toast.error("Error adding domain to blacklist");
    } finally {
      setIsAddingDomain(false);
    }
  };

  const removeDomain = async (domain: string): Promise<void> => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "removeFromBlacklist",
        domain: domain,
      });

      if (response?.success) {
        await loadBlacklist();
        toast(`${domain} removed from blacklist`);
      } else {
        toast.error("Failed to remove domain from blacklist");
      }
    } catch (error) {
      console.error("Error removing domain from blacklist:", error);
      toast.error("Error removing domain from blacklist");
    }
  };

  const clearBlacklist = async (): Promise<void> => {
    setConfirmDialog({
      isOpen: true,
      title: "Clear All Domains",
      message:
        "Are you sure you want to clear all blacklisted domains? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const promises = blacklistedDomains.map((domain) =>
            chrome.runtime.sendMessage({
              action: "removeFromBlacklist",
              domain: domain,
            })
          );

          await Promise.all(promises);
          await loadBlacklist();
          toast("All domains removed from blacklist");
        } catch (error) {
          console.error("Error clearing blacklist:", error);
          toast.error("Error clearing blacklist");
        }
      },
    });
  };

  const isValidDomain = (domain: string): boolean => {
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return (
      domainRegex.test(domain) && domain.length >= 3 && domain.length <= 253
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      addDomain();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
        confirmText="Clear All"
        cancelText="Cancel"
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog((prev) => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Nomee Settings</h1>
            <p className="text-gray-300">
              Manage your domain blacklist and preferences
            </p>
          </div>
        </div>

        {/* Blacklist Management */}
        <div className="backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 p-6 mb-6 animate-slide-in">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <X className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Domain Blacklist
              </h2>
              <p className="text-sm text-gray-300">
                Domains that won't be monitored for ETH addresses
              </p>
            </div>
          </div>

          {/* Add Domain Form */}
          <div className="mb-6">
            <div className="flex space-x-3">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter domain (e.g., example.com)"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addDomain}
                className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                  isAddingDomain ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={isAddingDomain}
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingDomain ? "Adding..." : "Add to Blacklist"}</span>
              </button>
            </div>
          </div>

          {/* Blacklisted Domains List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                Blacklisted Domains
              </h3>
              {blacklistedDomains.length > 0 && (
                <button
                  onClick={clearBlacklist}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {blacklistedDomains.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No domains blacklisted</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {blacklistedDomains.map((domain, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <X className="w-3 h-3 text-red-400" />
                      </div>
                      <span className="text-white font-medium">{domain}</span>
                    </div>
                    <button
                      onClick={() => removeDomain(domain)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                      title="Remove from blacklist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Extension Info */}
        <div className="backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 p-6 animate-slide-in">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">About Nomee</h2>
              <p className="text-sm text-gray-300">
                Connect with website owners through their domain name.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Features</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Real-time domain monitoring</li>
                <li>• ETH address resolution</li>
                <li>• Recent chat history</li>
                <li>• Domain blacklisting</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Privacy</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• No registration required</li>
                <li>• Local data storage</li>
                <li>• Secure connections</li>
                <li>• Decentralized chat</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
