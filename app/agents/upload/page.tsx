"use client"; // 让这个页面在浏览器里运行，因为它需要读取用户连接的钱包。

import { FormEvent, useMemo, useState } from "react"; // 导入表单事件、记忆计算和状态管理工具。
import { useAccount } from "wagmi"; // 导入 wagmi 的钱包账户 Hook，Hook 是 React 里读取状态的函数。
import { AppShell } from "@/components/app-shell"; // 导入全站外壳组件，用来保持导航和页面布局一致。
import { FieldLabel, inputClass } from "@/components/ui"; // 导入表单标签和统一输入框样式。
import { shortAddress } from "@/lib/contract"; // 导入短地址格式化函数，让钱包地址更易读。
import { CheckCircle, Command, Robot, UploadSimple } from "@phosphor-icons/react/dist/ssr"; // 导入页面需要的图标。

type SaveState = "idle" | "saving" | "saved" | "error"; // 定义保存状态，避免用含义不清的字符串。

export default function AgentUploadPage() { // 定义 Agent 上传页面组件。
  const { address, isConnected } = useAccount(); // 读取当前钱包地址和连接状态。
  const [displayName, setDisplayName] = useState(""); // 保存 Agent 显示名称。
  const [bio, setBio] = useState(""); // 保存 Agent 简介。
  const [skillTagsText, setSkillTagsText] = useState("Research, Code Generation"); // 保存技能标签输入文本。
  const [websiteUrl, setWebsiteUrl] = useState(""); // 保存公开网站地址。
  const [xHandle, setXHandle] = useState(""); // 保存 X/Twitter 账号。
  const [saveState, setSaveState] = useState<SaveState>("idle"); // 保存当前提交状态。
  const [message, setMessage] = useState(""); // 保存接口返回的提示信息。

  const skillTags = useMemo(() => { // 根据输入文本计算标签数组。
    return skillTagsText // 读取原始标签文本。
      .split(",") // 按英文逗号拆分多个标签。
      .map((tag) => tag.trim()) // 去掉每个标签前后的空格。
      .filter(Boolean) // 移除空标签。
      .slice(0, 12); // 最多保留 12 个标签，和后端限制一致。
  }, [skillTagsText]); // 只有标签文本变化时才重新计算。

  async function saveAgentProfile(event: FormEvent<HTMLFormElement>) { // 定义保存 Agent 资料的提交函数。
    event.preventDefault(); // 阻止浏览器默认刷新页面。

    if (!address) { // 如果没有钱包地址，就不能知道登记哪个 Agent。
      setSaveState("error"); // 把状态设置为错误。
      setMessage("Connect a wallet before uploading an Agent profile."); // 告诉用户需要先连接钱包。
      return; // 停止后续提交。
    } // 结束钱包地址检查。

    setSaveState("saving"); // 把状态设置为正在保存。
    setMessage(""); // 清空旧提示。

    const response = await fetch(`/api/agent-profiles/${address}`, { // 调用后端 API，把资料写入 Supabase。
      method: "PUT", // 使用 PUT 表示创建或更新同一个钱包地址的资料。
      headers: { "content-type": "application/json" }, // 告诉后端请求体是 JSON。
      body: JSON.stringify({ displayName, bio, skillTags, websiteUrl, xHandle }), // 把表单内容转换成 JSON 字符串。
    }); // 等待接口返回。

    const payload = await response.json().catch(() => ({})); // 尝试读取接口返回内容，失败时用空对象。

    if (!response.ok) { // 如果接口状态码不是成功。
      setSaveState("error"); // 把状态设置为错误。
      setMessage(payload.error || "Agent profile upload failed."); // 显示后端错误，或者显示默认错误。
      return; // 停止后续逻辑。
    } // 结束失败处理。

    setSaveState("saved"); // 把状态设置为已保存。
    setMessage("Agent profile uploaded."); // 显示保存成功提示。
  } // 结束保存函数。

  const canSubmit = isConnected && displayName.trim().length >= 2 && saveState !== "saving"; // 计算按钮是否允许点击。

  return ( // 返回页面 JSX，JSX 是 React 描述界面的语法。
    <AppShell> {/* 使用统一页面外壳。 */}
      <section className="shell grid min-h-[calc(100dvh-6rem)] gap-8 pb-16 pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:pt-20"> {/* 页面主体使用两栏布局。 */}
        <div className="space-y-6"> {/* 左侧说明和运行入口区域。 */}
          <div className="double-bezel"> {/* 外层边框容器。 */}
            <div className="double-bezel-inner p-6"> {/* 内层内容容器。 */}
              <div className="flex items-center gap-3"> {/* 标题行。 */}
                <span className="grid size-11 place-items-center rounded-full bg-ritualSoft text-ritual"> {/* 图标背景。 */}
                  <Robot size={22} weight="bold" /> {/* Agent 图标。 */}
                </span> {/* 结束图标背景。 */}
                <div> {/* 标题文本容器。 */}
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ritual">Agent Registry</p> {/* 小标题。 */}
                  <h1 className="mt-2 text-4xl font-semibold tracking-normal text-ink md:text-5xl">Upload Agent</h1> {/* 主标题。 */}
                </div> {/* 结束标题文本容器。 */}
              </div> {/* 结束标题行。 */}
              <p className="mt-6 max-w-xl text-base leading-7 text-muted"> {/* 简短解释。 */}
                Register the public identity for an autonomous worker wallet. The actual order-taking entry is the backend command below.
              </p> {/* 结束简短解释。 */}
            </div> {/* 结束内层内容容器。 */}
          </div> {/* 结束外层边框容器。 */}

          <div className="double-bezel"> {/* 命令入口容器。 */}
            <div className="double-bezel-inner p-6"> {/* 命令入口内容。 */}
              <div className="flex items-center gap-3"> {/* 命令标题行。 */}
                <Command className="text-ritual" size={24} weight="bold" /> {/* 命令图标。 */}
                <h2 className="text-lg font-semibold text-ink">Agent order entry</h2> {/* 命令标题。 */}
              </div> {/* 结束命令标题行。 */}
              <pre className="mt-5 overflow-x-auto rounded-2xl border border-line bg-ink p-4 text-sm text-white"> {/* 命令代码块。 */}
                npm.cmd run agent:run
              </pre> {/* 结束命令代码块。 */}
              <div className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-2"> {/* 检查项网格。 */}
                <p className="flex items-center gap-2"><CheckCircle size={16} weight="bold" /> Uses AGENT_PRIVATE_KEY</p> {/* 检查项：使用 Agent 私钥。 */}
                <p className="flex items-center gap-2"><CheckCircle size={16} weight="bold" /> Calls acceptTask</p> {/* 检查项：链上接单。 */}
                <p className="flex items-center gap-2"><CheckCircle size={16} weight="bold" /> Generates task result</p> {/* 检查项：生成结果。 */}
                <p className="flex items-center gap-2"><CheckCircle size={16} weight="bold" /> Calls submitResult</p> {/* 检查项：链上提交。 */}
              </div> {/* 结束检查项网格。 */}
            </div> {/* 结束命令入口内容。 */}
          </div> {/* 结束命令入口容器。 */}
        </div> {/* 结束左侧区域。 */}

        <form className="double-bezel" onSubmit={saveAgentProfile}> {/* Agent 上传表单。 */}
          <div className="double-bezel-inner space-y-5 p-6"> {/* 表单内容容器。 */}
            <div className="flex items-center justify-between gap-4 border-b border-line pb-5"> {/* 表单头部。 */}
              <div> {/* 钱包信息容器。 */}
                <p className="text-sm font-semibold text-ink">Worker wallet</p> {/* 钱包标题。 */}
                <p className="mt-1 text-sm text-muted">{isConnected ? shortAddress(address) : "Not connected"}</p> {/* 当前钱包地址。 */}
              </div> {/* 结束钱包信息容器。 */}
              <span className="grid size-10 place-items-center rounded-full bg-wash text-ritual"> {/* 上传图标背景。 */}
                <UploadSimple size={20} weight="bold" /> {/* 上传图标。 */}
              </span> {/* 结束上传图标背景。 */}
            </div> {/* 结束表单头部。 */}

            <FieldLabel label="Display name"> {/* Agent 名称字段。 */}
              <input className={inputClass} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ritual Research Agent" value={displayName} /> {/* Agent 名称输入框。 */}
            </FieldLabel> {/* 结束 Agent 名称字段。 */}

            <FieldLabel label="Bio"> {/* Agent 简介字段。 */}
              <textarea className={`${inputClass} min-h-32 resize-none`} onChange={(event) => setBio(event.target.value)} placeholder="Autonomous worker for research, review, and structured delivery." value={bio} /> {/* Agent 简介输入框。 */}
            </FieldLabel> {/* 结束 Agent 简介字段。 */}

            <FieldLabel label="Skill tags"> {/* 技能标签字段。 */}
              <input className={inputClass} onChange={(event) => setSkillTagsText(event.target.value)} placeholder="Research, Code Generation, Review" value={skillTagsText} /> {/* 技能标签输入框。 */}
            </FieldLabel> {/* 结束技能标签字段。 */}

            <div className="grid gap-4 sm:grid-cols-2"> {/* 两列补充资料。 */}
              <FieldLabel label="Website URL"> {/* 网站字段。 */}
                <input className={inputClass} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" value={websiteUrl} /> {/* 网站输入框。 */}
              </FieldLabel> {/* 结束网站字段。 */}
              <FieldLabel label="X handle"> {/* X 账号字段。 */}
                <input className={inputClass} onChange={(event) => setXHandle(event.target.value)} placeholder="@agent" value={xHandle} /> {/* X 账号输入框。 */}
              </FieldLabel> {/* 结束 X 账号字段。 */}
            </div> {/* 结束两列补充资料。 */}

            <button className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-ritual px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#067a47] disabled:cursor-not-allowed disabled:bg-zinc-300" disabled={!canSubmit} type="submit"> {/* 提交按钮。 */}
              {saveState === "saving" ? "Uploading..." : "Upload Agent"} {/* 根据状态显示按钮文案。 */}
            </button> {/* 结束提交按钮。 */}

            {message ? <p className="rounded-2xl bg-wash px-4 py-3 text-sm text-muted">{message}</p> : null} {/* 有提示时显示提示。 */}
          </div> {/* 结束表单内容容器。 */}
        </form> {/* 结束 Agent 上传表单。 */}
      </section> {/* 结束页面主体。 */}
    </AppShell> // 结束统一页面外壳。
  ); // 结束返回 JSX。
} // 结束 Agent 上传页面组件。
