import { useEffect, useState } from "react";
import type { ApiConfig } from "../types";
import { MODEL_ID, isConfigReady } from "../lib/model";

interface Props {
  config: ApiConfig;
  hint?: string | null;
  onSave: (config: ApiConfig) => void;
  onClose: () => void;
}

export default function ApiModal({ config, hint, onSave, onClose }: Props) {
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [showKey, setShowKey] = useState(false);
  const ready = isConfigReady({ apiKey });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => onSave({ apiKey: apiKey.trim() });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 className="modal-title">OpenRouter API Key</h2>
            <p className="modal-sub">模型固定为 {MODEL_ID}，只需填写 Key</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {hint && <div className="modal-hint">{hint}</div>}

        <div className="form-field">
          <label htmlFor="api-key">API Key</label>
          <div className="input-with-action">
            <input
              id="api-key"
              className="text-input"
              type={showKey ? "text" : "password"}
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ready) save();
              }}
              autoComplete="off"
              autoFocus
            />
            <button type="button" className="input-action" onClick={() => setShowKey((v) => !v)}>
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
          <span className="field-note">
            在 openrouter.ai 的 Settings / Keys 页面创建。
          </span>
        </div>

        <div className="modal-foot">
          <span className={`ready-state ${ready ? "is-ready" : ""}`}>
            <span className="ready-dot" />
            {ready ? "已就绪" : "未填写"}
          </span>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button className="btn btn-primary" onClick={save}>
              保存
            </button>
          </div>
        </div>
        <p className="modal-privacy">
          Key 只保存在本机浏览器中。请在本地用 npm run dev 启动后使用，请求经本地代理转发到 OpenRouter。
        </p>
      </div>
    </div>
  );
}
