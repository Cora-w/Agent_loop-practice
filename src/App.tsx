import { useState } from "react";
import type { ApiConfig, CaseData, Page, Puzzle } from "./types";
import HomePage from "./components/HomePage";
import SetupPage from "./components/SetupPage";
import InvestigatePage from "./components/InvestigatePage";
import ApiModal from "./components/ApiModal";

const STORAGE_KEY = "agent_api_config";

function loadConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { apiKey: "" };
    const parsed = JSON.parse(raw) as Partial<ApiConfig>;
    return { apiKey: parsed.apiKey ?? "" };
  } catch {
    return { apiKey: "" };
  }
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [runKey, setRunKey] = useState(0);
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
    setPuzzle(null);
    setPage("setup");
    window.scrollTo(0, 0);
  };

  const startPuzzle = (p: Puzzle) => {
    setPuzzle(p);
    setRunKey((k) => k + 1);
    setPage("investigate");
  };

  const goHome = () => {
    setPage("home");
    setSelectedCase(null);
    setPuzzle(null);
  };

  return (
    <>
      {page === "investigate" && selectedCase && puzzle ? (
        <InvestigatePage
          key={runKey}
          caseData={selectedCase}
          puzzle={puzzle}
          apiConfig={apiConfig}
          onBack={() => setPage("setup")}
          onOpenApi={openApiModal}
        />
      ) : page === "setup" && selectedCase ? (
        <SetupPage
          key={selectedCase.id}
          caseData={selectedCase}
          initial={puzzle}
          apiConfig={apiConfig}
          onBack={goHome}
          onStart={startPuzzle}
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
