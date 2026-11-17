import { useState } from "react";
import type { ApiConfig, CaseData, Page } from "./types";
import HomePage from "./components/HomePage";
import InvestigatePage from "./components/InvestigatePage";
import ApiModal from "./components/ApiModal";

const STORAGE_KEY = "agent_api_config";

const EMPTY_CONFIG: ApiConfig = { apiKey: "" };

function loadConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ApiConfig>;
    return { apiKey: parsed.apiKey ?? "" };
  } catch {
    return EMPTY_CONFIG;
  }
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(loadConfig);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [apiModalHint, setApiModalHint] = useState<string | null>(null);

  const openApiModal = (hint?: string) => {
    setApiModalHint(hint ?? null);
    setApiModalOpen(true);
  };

  const saveConfig = (config: ApiConfig) => {
    setApiConfig(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* 存储不可用时仅保存在内存中 */
    }
    setApiModalOpen(false);
  };

  const selectCase = (c: CaseData) => {
    setSelectedCase(c);
    setPage("investigate");
    window.scrollTo(0, 0);
  };

  const goHome = () => {
    setPage("home");
    setSelectedCase(null);
  };

  return (
    <>
      {page === "investigate" && selectedCase ? (
        <InvestigatePage
          key={selectedCase.id}
          caseData={selectedCase}
          apiConfig={apiConfig}
          onBack={goHome}
          onOpenApi={openApiModal}
        />
      ) : (
        <HomePage apiConfig={apiConfig} onSelectCase={selectCase} onOpenApi={() => openApiModal()} />
      )}

      {apiModalOpen && (
        <ApiModal
          config={apiConfig}
          hint={apiModalHint}
          onSave={saveConfig}
          onClose={() => setApiModalOpen(false)}
        />
      )}
    </>
  );
}
