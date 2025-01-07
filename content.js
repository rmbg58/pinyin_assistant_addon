/**
 * Pinyin Assistant - A Chrome extension to add pinyin to Chinese text
 * Copyright (c) 2024 rmb
 * 
 * ATTRIBUTION:
 * This extension's core pinyin conversion functionality is powered by pinyinjs
 * Project: https://github.com/sxei/pinyinjs
 * Author: 小茗同学 (https://github.com/sxei/)
 * License: MIT
 * 
 * pinyinjs is a lightweight web tool library for Chinese character and pinyin conversion.
 * The library features small size, multiple output formats, and support for polyphone characters.
 * 
 * Original description: 一个实现汉字与拼音互转的小巧web工具库
 */

// Content script runs in the context of web pages
console.log('Content script loaded');

// Create floating button element
const floatingButton = document.createElement('button');
floatingButton.textContent = '添加拼音';
floatingButton.className = 'pinyin-helper-button';
document.body.appendChild(floatingButton);

// Handle text selection
document.addEventListener('mouseup', (event) => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // Check if there's selected text and it contains Chinese characters
        if (selectedText && /[\u4e00-\u9fa5]/.test(selectedText)) {
            try {
                // Get the active element
                const activeElement = document.activeElement;
                let rect;
                
                if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
                    // For textarea/input, get cursor position
                    const coords = getCaretCoordinates(activeElement, activeElement.selectionEnd);
                    const elementRect = activeElement.getBoundingClientRect();
                    rect = {
                        right: elementRect.left + coords.left,
                        top: elementRect.top + coords.top,
                        bottom: elementRect.top + coords.top + coords.height
                    };
                } else {
                    const range = selection.getRangeAt(0);
                    rect = range.getBoundingClientRect();
                }
                
                // Calculate button position
                const buttonX = Math.min(
                    rect.right + window.pageXOffset,
                    window.innerWidth + window.pageXOffset - 100
                );
                const buttonY = Math.max(
                    rect.top + window.pageYOffset - 40,
                    window.pageYOffset
                );
                
                // Position the button
                floatingButton.style.left = `${buttonX}px`;
                floatingButton.style.top = `${buttonY}px`;
                floatingButton.style.display = 'block';
                
                // Store selection info
                floatingButton._currentSelection = {
                    text: selectedText,
                    element: activeElement,
                    start: activeElement.selectionStart,
                    end: activeElement.selectionEnd
                };
            } catch (e) {
                console.log('Selection handling error:', e);
            }
        } else {
            floatingButton.style.display = 'none';
        }
    }, 10);
});

// Hide button when clicking elsewhere
document.addEventListener('mousedown', (event) => {
    if (event.target !== floatingButton) {
        floatingButton.style.display = 'none';
    }
});

// Handle button click
floatingButton.addEventListener('click', () => {
    const selection = floatingButton._currentSelection;
    if (!selection) return;
    
    try {
        const pinyinText = getPinyin(selection.text);
        const newText = `${selection.text}(${pinyinText})`;
        
        if (selection.element.tagName === 'TEXTAREA' || selection.element.tagName === 'INPUT') {
            // Handle textarea/input
            const value = selection.element.value;
            const newValue = value.substring(0, selection.start) + 
                           newText + 
                           value.substring(selection.end);
            
            // Update value and selection
            selection.element.value = newValue;
            selection.element.selectionStart = selection.start;
            selection.element.selectionEnd = selection.start + newText.length;
            
            // Trigger events
            selection.element.dispatchEvent(new Event('input', { bubbles: true }));
            selection.element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // Handle contenteditable and other elements
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                
                // First, delete the selected content
                range.deleteContents();
                
                // Create and insert the new text
                const textNode = document.createTextNode(newText);
                range.insertNode(textNode);
                
                // Move cursor to end of inserted text
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                sel.removeAllRanges();
                sel.addRange(range);
                
                // For QQ mail and similar editors
                if (selection.element.isContentEditable) {
                    // Trigger input event for reactive editors
                    const inputEvent = new InputEvent('input', {
                        bubbles: true,
                        cancelable: true
                    });
                    selection.element.dispatchEvent(inputEvent);
                }
            }
        }
    } catch (e) {
        console.log('Error applying pinyin:', e);
    } finally {
        floatingButton.style.display = 'none';
        floatingButton._currentSelection = null;
    }
});

// Helper function to get caret coordinates in a textarea
function getCaretCoordinates(element, position) {
    const div = document.createElement('div');
    const style = getComputedStyle(element);
    const properties = [
        'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
        'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
        'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing'
    ];
    
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    
    properties.forEach(prop => {
        div.style[prop] = style[prop];
    });
    
    div.textContent = element.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const coordinates = {
        top: span.offsetTop,
        left: span.offsetLeft,
        height: span.offsetHeight
    };
    document.body.removeChild(div);
    
    return coordinates;
}

// Function to get pinyin using pinyinjs library
function getPinyin(text) {
    return pinyinUtil.getPinyin(text, ' ', true, true);
} 