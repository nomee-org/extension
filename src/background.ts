let isExtensionEnabled: boolean = true;
let currentDomain: string | null = null;
let ethAddress: string | undefined = undefined;
let price: string | undefined = undefined;
let decimals: number | undefined = undefined;
let currency: string | undefined = undefined;
let cachedBlacklistedDomains: string[] = [];

// Load saved settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(
    ["extensionEnabled", "blacklistedDomains"],
    (result) => {
      isExtensionEnabled = result.extensionEnabled !== false;
      cachedBlacklistedDomains = result.blacklistedDomains || [];
    }
  );
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(
  (_: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      handleTabUpdate(tab);
    }
  }
);

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo: chrome.tabs.TabActiveInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab: chrome.tabs.Tab) => {
    if (tab.url) {
      handleTabUpdate(tab);
    }
  });
});

async function handleTabUpdate(tab: chrome.tabs.Tab): Promise<void> {
  if (!isExtensionEnabled) return;

  const domain = extractDomain(tab.url);
  if (domain !== currentDomain) {
    currentDomain = domain;

    if (domain && !cachedBlacklistedDomains.includes(domain)) {
      // Check if domain is already in recent chats to prevent duplicate popups
      const shouldShowPopup = await shouldAutoOpenPopup(domain);

      try {
        const nameData = await resolveNameAddress(domain);
        if (!nameData) return;

        const amount = extractPriceFromName(nameData);

        ethAddress = parseCAIP10(nameData?.claimedBy).address;
        price = amount?.price;
        decimals = amount?.decimals;
        currency = amount?.currency;

        // Update badge
        if (ethAddress && tab.id) {
          chrome.action.setBadgeText({
            text: "●",
            tabId: tab.id,
          });
          chrome.action.setBadgeBackgroundColor({
            color: "#10B981",
            tabId: tab.id,
          });

          // Auto-open popup only if not already in recent chats or blacklisted
          if (shouldShowPopup) {
            // Use a small delay to ensure tab is fully loaded
            setTimeout(() => {
              chrome.action.openPopup().catch(() => {
                // Fallback: show notification if popup can't be opened
                chrome.notifications.create(`eth-found-${domain}`, {
                  type: "basic",
                  iconUrl: "icon48.png",
                  title: "Nomee - Owner Found!",
                  message: `You can now chat with ${domain} owner`,
                });
              });
            }, 500);
          }
        } else if (tab.id) {
          chrome.action.setBadgeText({
            text: "",
            tabId: tab.id,
          });
        }
      } catch (error) {
        console.error("Error resolving ETH address:", error);
        ethAddress = undefined;
        price = undefined;
        decimals = undefined;
        currency = undefined;
        if (tab.id) {
          chrome.action.setBadgeText({
            text: "",
            tabId: tab.id,
          });
        }
      }
    } else if (tab.id) {
      // Clear badge for blacklisted domains
      chrome.action.setBadgeText({
        text: "",
        tabId: tab.id,
      });
      ethAddress = undefined;
      price = undefined;
      decimals = undefined;
      currency = undefined;
    }
  }
}

function extractPriceFromName(nameData: any): {
  price: string;
  decimals: number;
  currency: string;
} | null {
  try {
    if (nameData?.tokens && (nameData?.tokens?.length ?? 0) > 0) {
      const token = nameData?.tokens?.[0];
      if (token?.listings && (token?.listings?.length ?? 0) > 0) {
        const listing = token.listings[0];
        return {
          price: listing?.price,
          decimals: listing?.currency?.decimals,
          currency: listing?.currency?.symbol,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error extracting price:", error);
    return null;
  }
}

function extractDomain(url?: string): string | null {
  console.log({ url });

  if (!url) return null;

  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();

    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    // Validate domain format
    if (!hostname.includes(".") || hostname.length < 3) {
      return null;
    }

    return hostname;
  } catch (error) {
    console.error("Error extracting domain:", error);
    return null;
  }
}

function parseCAIP10(input: string) {
  const parts = input.split(":");

  const namespace = parts[0];
  const chainId = parts[1];
  const address = parts[2] ?? null;

  return { namespace, chainId, address };
}

async function resolveNameAddress(domain: string): Promise<any | null> {
  try {
    const response = await fetch("https://api-testnet.doma.xyz/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key":
          "v1.59ca927ae4d7427e57826c7954f93e0ba64b291f4f970aacb03336b62946c9cb",
      },
      body: JSON.stringify({
        query: `
          query NameQuery($name: String!) {
            name(name: $name) {
              name 
              claimedBy 
              tokens {
                ownerAddress
                listings {
                  price
                  currency {
                    symbol
                    decimals
                    usdExchangeRate
                  }
                }
              }
            }
          }
        `,
        variables: { name: domain },
      }),
    });

    console.log({ response });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const data = await response.json();

    console.log({ data });

    if (data.errors && data.errors.length) {
      return null;
    }

    return data.data.name;
  } catch (error) {
    console.error("Error resolving domain via GraphQL:", error);
    return null;
  }
}

async function shouldAutoOpenPopup(domain: string): Promise<boolean> {
  try {
    const [recentChatsResult, blacklistResult] = await Promise.all([
      chrome.storage.sync.get(["recentChats"]),
      chrome.storage.sync.get(["blacklistedDomains"]),
    ]);

    const recentChats = recentChatsResult.recentChats || [];
    const blacklistedDomains = blacklistResult.blacklistedDomains || [];

    const isInRecentChats = recentChats.some(
      (chat: any) => chat.domain === domain
    );
    const isBlacklisted = blacklistedDomains.includes(domain);

    return !isInRecentChats && !isBlacklisted;
  } catch (error) {
    console.error("Error checking popup conditions:", error);
    return false; // Default to not showing popup if check fails
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (
    request: any,
    _: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) => {
    if (request.action === "getStatus") {
      sendResponse({
        enabled: isExtensionEnabled,
        domain: currentDomain,
        ethAddress: ethAddress,
        price: price,
        decimals: decimals,
        currency: currency,
      });
    } else if (request.action === "addToRecentChats") {
      addToRecentChats(
        request.domain,
        request.ethAddress,
        request.price,
        request.decimals,
        request.currency
      );
      sendResponse({ success: true });
    } else if (request.action === "getRecentChats") {
      chrome.storage.sync.get(["recentChats"], (result) => {
        sendResponse({ recentChats: result.recentChats || [] });
      });
      return true; // Keep message channel open for async response
    } else if (request.action === "removeFromRecentChats") {
      removeFromRecentChats(request.domain);
      sendResponse({ success: true });
    } else if (request.action === "addToBlacklist") {
      addToBlacklist(request.domain);
      sendResponse({ success: true });
    } else if (request.action === "getBlacklist") {
      chrome.storage.sync.get(["blacklistedDomains"], (result) => {
        sendResponse({ blacklistedDomains: result.blacklistedDomains || [] });
      });
      return true;
    } else if (request.action === "removeFromBlacklist") {
      removeFromBlacklist(request.domain);
      sendResponse({ success: true });
    } else if (request.action === "toggleExtension") {
      isExtensionEnabled = !isExtensionEnabled;
      chrome.storage.sync.set({ extensionEnabled: isExtensionEnabled });

      // Clear badge if disabled
      if (!isExtensionEnabled) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.action.setBadgeText({
              text: "",
              tabId: tabs[0].id,
            });
          }
        });
      } else {
        ethAddress = undefined;
        price = undefined;
        decimals = undefined;
        currency = undefined;
        // Re-check current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            handleTabUpdate(tabs[0]);
          }
        });
      }

      sendResponse({ enabled: isExtensionEnabled });
    }
  }
);

async function addToRecentChats(
  domain: string,
  ethAddress: string,
  price?: string,
  decimals?: number,
  currency?: string
): Promise<void> {
  const result = await chrome.storage.sync.get(["recentChats"]);
  let recentChats = result.recentChats || [];

  // Remove existing entry if it exists
  recentChats = recentChats.filter((chat: any) => chat.domain !== domain);

  // Add to beginning of array
  recentChats.unshift({
    domain,
    ethAddress,
    price,
    decimals,
    currency,
    timestamp: Date.now(),
  });

  // Keep only last 10 entries
  recentChats = recentChats.slice(0, 10);

  await chrome.storage.sync.set({ recentChats });
}

async function removeFromRecentChats(domain: string): Promise<void> {
  const result = await chrome.storage.sync.get(["recentChats"]);
  let recentChats = result.recentChats || [];

  recentChats = recentChats.filter((chat: any) => chat.domain !== domain);

  await chrome.storage.sync.set({ recentChats });
}

async function addToBlacklist(domain: string): Promise<void> {
  const result = await chrome.storage.sync.get(["blacklistedDomains"]);
  let blacklistedDomains: string[] = result.blacklistedDomains || [];

  if (!blacklistedDomains.includes(domain)) {
    blacklistedDomains.push(domain);
    await chrome.storage.sync.set({ blacklistedDomains });

    // Update local cache
    cachedBlacklistedDomains = blacklistedDomains;

    // Clear current tab if it's blacklisted
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && extractDomain(tabs[0].url) === domain) {
        chrome.action.setBadgeText({
          text: "",
          tabId: tabs[0].id,
        });
        ethAddress = undefined;
        price = undefined;
        decimals = undefined;
        currency = undefined;
      }
    });
  }
}

async function removeFromBlacklist(domain: string): Promise<void> {
  const result = await chrome.storage.sync.get(["blacklistedDomains"]);
  let blacklistedDomains: string[] = result.blacklistedDomains || [];

  blacklistedDomains = blacklistedDomains.filter((d) => d !== domain);

  await chrome.storage.sync.set({ blacklistedDomains });

  // Update local cache
  cachedBlacklistedDomains = blacklistedDomains;

  // Re-check current tab if it was blacklisted
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && extractDomain(tabs[0].url) === domain) {
      handleTabUpdate(tabs[0]);
    }
  });
}
