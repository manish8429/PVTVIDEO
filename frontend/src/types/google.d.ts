// Type declarations for Google Identity Services (GSI)
interface GoogleCredentialResponse {
  credential: string
  select_by: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }) => void
  prompt: (notification?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void
  renderButton: (element: HTMLElement, options: object) => void
  disableAutoSelect: () => void
  revoke: (hint: string, done: () => void) => void
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId
    }
  }
}
