import { Component, type ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, resetError: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError)
      }

      return (
        <div className='flex items-center min-h-screen justify-center w-screen p-4'>
          <Card className='w-full max-w-2xl'>
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred in the application
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Alert variant='destructive'>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{this.state.error.message}</AlertDescription>
              </Alert>
              <details className='text-sm'>
                <summary className='cursor-pointer font-medium mb-2'>
                  Technical Details
                </summary>
                <pre className='overflow-auto bg-muted p-4 rounded-md text-xs'>
                  {this.state.error.stack}
                </pre>
              </details>
            </CardContent>
            <CardFooter className='flex gap-2'>
              <Button onClick={this.resetError} className='flex-1'>
                Try Again
              </Button>
              <Button
                variant='outline'
                onClick={() => window.location.reload()}
                className='flex-1'
              >
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
