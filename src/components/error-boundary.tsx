'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
          <Card className="max-w-md w-full border-2 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-headline font-bold">Something went wrong</CardTitle>
              <CardDescription>
                The application encountered an unexpected error. This has been logged for our team to investigate.
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-muted/50 p-4 rounded-xl mx-6 mb-6">
              <p className="text-[10px] font-mono text-muted-foreground break-all leading-tight">
                {this.state.error?.message || "Unknown error occurred"}
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={this.handleReset} className="w-full h-12 font-bold gap-2 shadow-lg shadow-primary/20">
                <RefreshCcw className="w-4 h-4" />
                Refresh Application
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
