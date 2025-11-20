# Test Documentation

## Overview
This document outlines the test cases for the Storage Manager Chrome Extension, which manages localStorage, sessionStorage, and potentially IndexedDB storage.

## Test Environment
- Framework: Vitest
- UI Testing: @vue/test-utils
- Chrome API Mocking: Required for extension APIs

## Test Categories

### 1. Store Tests (`src/store/index.ts`)

#### 1.1 Store Initialization
- **Test**: Store initializes with default values
- **Expected**: `copyType: false`, `syncUrl: ''`, `refreshToken: 0`

#### 1.2 Copy Type Management
- **Test**: `setCopyType` updates the copyType value
- **Expected**: Store value changes from false to true

#### 1.3 Sync URL Management
- **Test**: `setSyncUrl` updates the syncUrl value
- **Expected**: Store value changes to provided URL

#### 1.4 Refresh Token
- **Test**: `triggerRefresh` increments refreshToken
- **Expected**: refreshToken increases by 1 each call

#### 1.5 Restore Functionality
- **Test**: `restore` resets store to default values
- **Expected**: All values return to defaults

### 2. ContentList Component Tests

#### 2.1 Data Fetching
- **Test**: `fetchStorageData` retrieves localStorage entries
- **Expected**: Returns array of storage entries with name and value
- **Test**: `fetchStorageData` retrieves sessionStorage entries
- **Expected**: Returns array of storage entries for sessionStorage
- **Test**: Handle case when Chrome APIs are unavailable
- **Expected**: Returns empty array

#### 2.2 Search Functionality
- **Test**: Filter entries by search key
- **Expected**: Only matching entries are displayed
- **Test**: Case-insensitive search
- **Expected**: Search works regardless of case
- **Test**: Clear search when switching storage types
- **Expected**: searchKey resets to empty string

#### 2.3 Add Entry
- **Test**: Add new entry with valid key and value
- **Expected**: Entry is added and persisted to storage
- **Test**: Add entry with empty key
- **Expected**: Shows error feedback "请输入键名"
- **Test**: Update existing entry when key exists
- **Expected**: Entry is updated, not duplicated
- **Test**: Clear inputs after successful add
- **Expected**: newEntryKey and newEntryValue are reset

#### 2.4 Edit Entry
- **Test**: Start editing cell by double-clicking
- **Expected**: Input field appears with current value
- **Test**: Save edited name
- **Expected**: Entry name is updated and persisted
- **Test**: Save edited value
- **Expected**: Entry value is updated and persisted
- **Test**: Cancel editing with ESC key
- **Expected**: Changes are discarded, editing mode exits
- **Test**: Prevent saving empty name
- **Expected**: Name field remains unchanged if empty

#### 2.5 Delete Entry
- **Test**: Open delete confirmation dialog
- **Expected**: Dialog shows with entry name
- **Test**: Confirm delete
- **Expected**: Entry is removed from storage and UI
- **Test**: Cancel delete
- **Expected**: Entry remains unchanged
- **Test**: Delete entry that's being edited
- **Expected**: Editing state is cleared

#### 2.6 Copy Functionality
- **Test**: Copy entry value (default mode)
- **Expected**: Raw value is copied to clipboard
- **Test**: Copy as JS snippet
- **Expected**: `localStorage.setItem(key, value)` is copied
- **Test**: Copy via right-click context menu
- **Expected**: Value is copied successfully
- **Test**: Fallback to document.execCommand if clipboard API fails
- **Expected**: Copying still works with fallback
- **Test**: Show appropriate feedback message
- **Expected**: "值已复制" or "已复制 localStorage.setItem(...)"

#### 2.7 Persistence
- **Test**: `persistStorageUpdate` saves to actual storage
- **Expected**: Chrome scripting API is called correctly
- **Test**: Handle rename operation (key change)
- **Expected**: Old key is removed, new key is created
- **Test**: Handle persistence failure
- **Expected**: Data is reloaded from storage

#### 2.8 Edge Cases
- **Test**: Handle multiple rapid clicks
- **Expected**: Only one operation executes
- **Test**: Handle concurrent add operations
- **Expected**: `adding` flag prevents duplicate submissions
- **Test**: Feedback message timeout
- **Expected**: Message disappears after 2 seconds
- **Test**: Component unmount cleanup
- **Expected**: Timers are cleared

### 3. Popup Component Tests

#### 3.1 Theme Management
- **Test**: Apply dark theme based on system preference
- **Expected**: 'dark' class is added to documentElement
- **Test**: Apply light theme based on system preference
- **Expected**: 'dark' class is removed from documentElement
- **Test**: Listen to theme preference changes
- **Expected**: Theme updates when system preference changes
- **Test**: Cleanup listeners on beforeunload
- **Expected**: Event listeners are properly removed

#### 3.2 Component Structure
- **Test**: Render Header, Settings, and Content components
- **Expected**: All components are mounted

### 4. Content Component Tests

#### 4.1 Tab Switching
- **Test**: Default tab is localStorage
- **Expected**: localStorage tab is active on mount
- **Test**: Switch to sessionStorage tab
- **Expected**: sessionStorage ContentList is displayed
- **Test**: Tabs preserve content when switching
- **Expected**: unmount-on-hide is false, content persists

### 5. Integration Tests

#### 5.1 End-to-End User Flows
- **Test**: Complete add → edit → delete flow
- **Expected**: All operations complete successfully
- **Test**: Search → edit filtered entry
- **Expected**: Search filters work with editing
- **Test**: Copy type toggle affects copy behavior
- **Expected**: Switching copyType changes copy output
- **Test**: Refresh storage after external changes
- **Expected**: Data reloads when triggerRefresh is called

### 6. Chrome Extension API Tests

#### 6.1 Script Injection
- **Test**: Execute script in active tab
- **Expected**: Script runs in correct context (MAIN world)
- **Test**: Handle no active tab
- **Expected**: Returns gracefully without error
- **Test**: Handle script injection errors
- **Expected**: Errors are caught and logged

#### 6.2 Tab Management
- **Test**: Query active tab
- **Expected**: Returns current active tab
- **Test**: Handle multiple tabs
- **Expected**: Only affects current tab

## Test Execution Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/store/index.test.ts
```

## Mock Requirements

### Chrome APIs to Mock
- `chrome.tabs.query`
- `chrome.scripting.executeScript`
- `chrome.runtime.onInstalled`

### Browser APIs to Mock
- `navigator.clipboard.writeText`
- `document.execCommand`
- `window.matchMedia`
- `MediaQueryList` events

## Coverage Goals
- Unit tests: > 80% coverage
- Integration tests: Key user flows covered
- Edge cases: Error handling and boundary conditions

## Future Test Additions
- IndexedDB support tests (when implemented)
- Sync URL functionality tests (when implemented)
- Performance tests for large storage datasets
- Accessibility tests for keyboard navigation
