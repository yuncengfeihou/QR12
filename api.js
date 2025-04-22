// api.js
import * as Constants from './constants.js';
// 导入 state 可能不再需要，除非 setMenuVisible 在别处调用
// import { setMenuVisible } from './state.js';

/**
 * Fetches chat and global quick replies from the quickReplyApi,
 * AND scans for JS Slash Runner buttons to add as chat replies.
 * Checks if the main Quick Reply v2 extension is enabled before fetching.
 * @returns {{ chat: Array<object>, global: Array<object> }}
 */
export function fetchQuickReplies() {
    let chatReplies = []; // 用 let 替代 const，因为我们会追加扫描到的按钮
    const globalReplies = [];
    const chatQrLabels = new Set(); // To track labels and avoid duplicates in global

    // --- 标准 Quick Reply v2 获取逻辑 (保持不变) ---
    if (!window.quickReplyApi) {
        console.warn(`[${Constants.EXTENSION_NAME}] Quick Reply API (window.quickReplyApi) not found! Cannot fetch standard replies.`);
    } else {
        const qrApi = window.quickReplyApi;
        if (!qrApi.settings || qrApi.settings.isEnabled === false) {
            console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Skipping standard reply fetch.`);
        } else {
            try {
                // Fetch Chat Quick Replies (Standard)
                if (qrApi.settings?.chatConfig?.setList) {
                    qrApi.settings.chatConfig.setList.forEach(setLink => {
                        if (setLink?.isVisible && setLink.set?.qrList) {
                            setLink.set.qrList.forEach(qr => {
                                if (qr && !qr.isHidden && qr.label) {
                                    chatReplies.push({
                                        setName: setLink.set.name || 'Unknown Set',
                                        label: qr.label,
                                        message: qr.message || '(无消息内容)',
                                        isStandard: true, // 标记为标准QR
                                    });
                                    chatQrLabels.add(qr.label);
                                }
                            });
                        }
                    });
                } else {
                    console.warn(`[${Constants.EXTENSION_NAME}] Could not find chatConfig.setList in quickReplyApi settings.`);
                }

                // Fetch Global Quick Replies (Standard)
                if (qrApi.settings?.config?.setList) {
                    qrApi.settings.config.setList.forEach(setLink => {
                        if (setLink?.isVisible && setLink.set?.qrList) {
                            setLink.set.qrList.forEach(qr => {
                                if (qr && !qr.isHidden && qr.label && !chatQrLabels.has(qr.label)) {
                                    globalReplies.push({
                                        setName: setLink.set.name || 'Unknown Set',
                                        label: qr.label,
                                        message: qr.message || '(无消息内容)',
                                        isStandard: true, // 标记为标准QR
                                    });
                                }
                            });
                        }
                    });
                } else {
                    console.warn(`[${Constants.EXTENSION_NAME}] Could not find config.setList in quickReplyApi settings.`);
                }
            } catch (error) {
                console.error(`[${Constants.EXTENSION_NAME}] Error fetching standard quick replies:`, error);
            }
        }
    }
    // --- 标准 Quick Reply v2 获取逻辑结束 ---


    // --- 新增：扫描 JS Slash Runner 按钮 ---
    try {
        const jsRunnerButtonContainer = document.getElementById('TH-script-buttons');
        if (jsRunnerButtonContainer) {
            const jsRunnerButtons = jsRunnerButtonContainer.querySelectorAll('button'); // 获取容器内所有按钮
            const scannedLabels = new Set(); // 防止重复添加相同标签的脚本按钮

            jsRunnerButtons.forEach(button => {
                const label = button.textContent?.trim();
                if (label && !scannedLabels.has(label)) {
                    // 避免与已有的标准聊天QR重复 (可选，看你是否希望覆盖)
                    // if (!chatQrLabels.has(label)) {
                        chatReplies.push({
                            setName: 'JS脚本按钮', // 给一个特殊的 Set 名称
                            label: label,
                            message: `jsrunner_button_${label}`, // 特殊标记，表示这是JS Runner按钮
                            isStandard: false, // 标记为非标准 (JS Runner)
                        });
                        scannedLabels.add(label);
                    // }
                }
            });
            if (scannedLabels.size > 0) {
                 console.log(`[${Constants.EXTENSION_NAME}] Found ${scannedLabels.size} JS Runner buttons.`);
            }
        } else {
            // console.log(`[${Constants.EXTENSION_NAME}] JS Runner button container (#TH-script-buttons) not found.`);
        }
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error scanning for JS Runner buttons:`, error);
    }
    // --- 扫描结束 ---


    console.log(`[${Constants.EXTENSION_NAME}] Fetched Replies - Chat (incl. JS Runner): ${chatReplies.length}, Global: ${globalReplies.length}`);
    return { chat: chatReplies, global: globalReplies };
}


/**
 * Triggers a standard quick reply using the API.
 * NOTE: This function is now ONLY for standard Quick Replies.
 * JS Runner buttons are handled separately in handleQuickReplyClick.
 * @param {string} setName
 * @param {string} label
 */
export async function triggerQuickReply(setName, label) {
    // ...(保持原有的 Quick Reply API 调用逻辑不变)...
    if (!window.quickReplyApi) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API not found! Cannot trigger standard reply.`);
        return;
    }
    if (!window.quickReplyApi.settings || window.quickReplyApi.settings.isEnabled === false) {
         console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Cannot trigger standard reply.`);
         return;
    }

    console.log(`[${Constants.EXTENSION_NAME}] Triggering Standard Quick Reply: "${setName}.${label}"`);
    try {
        await window.quickReplyApi.executeQuickReply(setName, label);
        console.log(`[${Constants.EXTENSION_NAME}] Standard Quick Reply "${setName}.${label}" executed successfully.`);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to execute standard Quick Reply "${setName}.${label}":`, error);
    }
}
