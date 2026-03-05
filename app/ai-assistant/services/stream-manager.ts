/**
 * Streaming Service
 * Provides utilities for handling server-sent events (SSE) streams
 */

export interface StreamManager {
  sendMessage: (data: any) => void
  sendError: (error: ErrorMessage) => void
  closeStream: () => void
  handleStreamingError: (error: Error & {status?: number}) => void
  isAborted: () => boolean
  getAbortSignal: () => AbortSignal
}

interface ErrorMessage {
  type: string
  error: string
  details: string
}

/**
 * Creates a StreamManager to handle SSE streams with proper backpressure
 * @param {TextEncoder} encoder - A TextEncoder instance
 * @param {ReadableStreamDefaultController} controller - The stream controller
 * @param {AbortSignal} abortSignal - Abort signal for cancellation
 * @returns {StreamManager} StreamManager with utility methods for handling streaming
 */
export function createStreamManager(
  encoder: any,
  controller: ReadableStreamDefaultController<Uint8Array>,
  abortSignal: AbortSignal
): StreamManager {
  /**
   * Send a data message to the client
   * @param {any} data - Data to send
   */
  const sendMessage = (data: any): void => {
    try {
      if (abortSignal.aborted) {
        console.log('🚫 Stream aborted, skipping message send')
        return
      }
      const text = `data: ${JSON.stringify(data)}\n\n`
      controller.enqueue(encoder.encode(text))
    } catch (error) {
      console.error('Error sending stream message:', error)
    }
  }

  /**
   * Send an error message to the client
   * @param {ErrorMessage} error - Error object
   */
  const sendError = ({type, error, details}: ErrorMessage): void => {
    sendMessage({type, error, details})
  }

  /**
   * Close the stream
   */
  const closeStream = (): void => {
    try {
      controller.close()
    } catch (error) {
      console.error('Error closing stream:', error)
    }
  }

  /**
   * Handle streaming errors by sending appropriate error messages
   * @param {Error & { status?: number }} error - The error that occurred
   */
  const handleStreamingError = (error: Error & {status?: number}): void => {
    console.error('Error processing streaming request:', error)

    if (error.status === 401 || error.message.includes('auth') || error.message.includes('key')) {
      sendError({
        type: 'error',
        error: 'Authentication failed with Claude API',
        details: 'Please check your API key in environment variables',
      })
    } else if (error.status === 429 || error.status === 529 || error.message.includes('Overloaded')) {
      sendError({
        type: 'rate_limit_exceeded',
        error: 'Rate limit exceeded',
        details: 'Please try again later',
      })
    } else {
      sendError({
        type: 'error',
        error: 'Failed to get response from LLM',
        details: error.message,
      })
    }
  }

  /**
   * Check if the stream has been aborted
   */
  const isAborted = (): boolean => {
    return abortSignal.aborted
  }

  /**
   * Get the abort signal
   */
  const getAbortSignal = (): AbortSignal => {
    return abortSignal
  }

  return {
    sendMessage,
    sendError,
    closeStream,
    handleStreamingError,
    isAborted,
    getAbortSignal,
  }
}

/**
 * Creates a ReadableStream for SSE with abort support
 * @param {(streamManager: StreamManager) => Promise<void>} streamHandler - Async function that handles the stream
 * @param {AbortSignal} abortSignal - Abort signal for cancellation
 * @returns {ReadableStream} A readable stream for SSE
 */
export function createSseStream(
  streamHandler: (streamManager: StreamManager) => Promise<void>,
  abortSignal: AbortSignal
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const streamManager = createStreamManager(encoder, controller, abortSignal)

      try {
        // Check if already aborted before starting
        if (abortSignal.aborted) {
          console.log('🚫 Stream aborted before starting')
          return
        }

        await streamHandler(streamManager)
      } catch (error) {
        // Don't handle errors if the stream was aborted
        if (!abortSignal.aborted) {
          streamManager.handleStreamingError(error as Error & {status?: number})
        } else {
          console.log('🚫 Stream aborted, skipping error handling')
        }
      } finally {
        if (!abortSignal.aborted) {
          streamManager.closeStream()
        }
      }
    },
  })
}

export default {
  createSseStream,
  createStreamManager,
}
