// api.js
import * as Constants from './constants.js';

/**
 * Fetches chat and global quick replies from the quickReplyApi,
 * AND scans for JS Slash Runner buttons to add as chat replies.
 * Includes enhanced logging for debugging.
 * @returns {{ chat: Array<object>, global: Array<object> }}
 */
export function fetchQuickReplies() {
    console.log(`[${Constants.EXTENSION_NAME} Debug] fetchQuickReplies called.`); // DEBUG
    let chatReplies = [];
    const globalReplies = [];
    const chatQrLabels = new Set();

    // --- Standard Quick Reply v2 Fetching (Keep as is, but add logs if needed) ---
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
                                        isStandard: true,
                                    });
                                    chatQrLabels.add(qr.label);
                                }
                            });
                        }
                    });
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
                                        isStandard: true,
                                    });
                                }
                            });
                        }
                    });
                }
                 console.log(`[${Constants.EXTENSION_NAME} Debug] Fetched ${chatReplies.length} standard chat QR, ${globalReplies.length} standard global QR.`); // DEBUG
            } catch (error) {
                console.error(`[${Constants.EXTENSION_NAME}] Error fetching standard quick replies:`, error);
            }
        }
    }
    // --- End Standard Fetching ---

    // --- Enhanced JS Slash Runner Button Scanning ---
    console.log(`[${Constants.EXTENSION_NAME} Debug] Starting JS Runner button scan...`); // DEBUG
    try {
        // **重要**: 确认 JS Runner 按钮容器的 ID 真的是 'TH-script-buttons'
        const jsRunnerButtonContainerId = 'TH-script-buttons';
        const jsRunnerButtonContainer = document.getElementById(jsRunnerButtonContainerId);

        if (jsRunnerButtonContainer) {
            console.log(`[${Constants.EXTENSION_NAME} Debug] Found container #${jsRunnerButtonContainerId}:`, jsRunnerButtonContainer); // DEBUG

            // **重要**: 确认按钮的选择器是 'button'。如果按钮嵌套在其他元素里，可能需要调整。
            const jsRunnerButtons = jsRunnerButtonContainer.querySelectorAll('button');
            console.log(`[${Constants.EXTENSION_NAME} Debug] Found ${jsRunnerButtons.length} button elements inside.`); // DEBUG

            const scannedLabels = new Set(); // Track labels found in this scan

            if (jsRunnerButtons.length > 0) {
                jsRunnerButtons.forEach((button, index) => {
                    // **重要**: 检查按钮文本是如何获取的。是直接 textContent 还是在子元素里？
                    const label = button.textContent?.trim();
                    console.log(`[${Constants.EXTENSION_NAME} Debug] Scanning button #${index}: Label='${label}', Element:`, button); // DEBUG

                    if (label && label !== '' && !scannedLabels.has(label)) {
                        console.log(`[${Constants.EXTENSION_NAME} Debug] Adding JS Runner button: Label='${label}'`); // DEBUG
                        chatReplies.push({
                            setName: 'JS脚本按钮', // Special Set Name
                            label: label,
                            message: `jsrunner_button_${label}`, // Identifier for click handler
                            isStandard: false, // Mark as non-standard
                        });
                        scannedLabels.add(label);
                        // 可选：检查是否与标准聊天QR冲突
                        // if (chatQrLabels.has(label)) {
                        //     console.warn(`[${Constants.EXTENSION_NAME}] JS Runner button label '${label}' conflicts with a standard chat QR.`);
                        // }
                    } else if (label && scannedLabels.has(label)) {
                        console.log(`[${Constants.EXTENSION_NAME} Debug] Skipping duplicate JS Runner label: '${label}'`); // DEBUG
                    } else if (!label || label === '') {
                         console.log(`[${Constants.EXTENSION_NAME} Debug] Skipping button #${index} due to empty label.`); // DEBUG
                    }
                });
                console.log(`[${Constants.EXTENSION_NAME} Debug] Finished scanning JS Runner buttons. Added ${scannedLabels.size} unique buttons.`); // DEBUG
            } else {
                console.log(`[${Constants.EXTENSION_NAME} Debug] No <button> elements found inside #${jsRunnerButtonContainerId}.`); // DEBUG
            }
        } else {
            // **关键调试点**: 如果这里一直输出，说明容器没找到，需要确认ID或加载时机
            console.log(`[${Constants.EXTENSION_NAME} Debug] JS Runner button container #${jsRunnerButtonContainerId} NOT FOUND in the DOM.`); // DEBUG
        }
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error during JS Runner button scanning:`, error); // DEBUG
    }
    // --- End Scanning ---

    console.log(`[${Constants.EXTENSION_NAME} Debug] Final fetch results - Chat (incl. JS): ${chatReplies.length}, Global: ${globalReplies.length}`); // DEBUG
    // console.log(`[${Constants.EXTENSION_NAME} Debug] Final chatReplies data:`, JSON.stringify(chatReplies)); // DEBUG (Optional deep inspection)
    return { chat: chatReplies, global: globalReplies };
}


/**
 * Triggers a standard quick reply using the API.
 * (Keep this function as is)
 * @param {string} setName
 * @param {string} label
 */
export async function triggerQuickReply(setName, label) {
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
