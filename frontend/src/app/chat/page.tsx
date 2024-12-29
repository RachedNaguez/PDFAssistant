"use client";
import React, { useState, useRef, useContext, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Trash2,
  MenuIcon,
  MountainIcon,
  Send,
  FileText,
  LogOut,
  User,
  X,
  Paperclip,
  Info,
  Cloud,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import AuthContext from "../context/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["application/pdf"];

export default function Home() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
  }, [router]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const validateFiles = (files: File[]): string | null => {
    for (const file of files) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        return `${file.name} is not a PDF file`;
      }
      if (file.size > MAX_FILE_SIZE) {
        return `${file.name} is too large. Maximum size is 10MB`;
      }
    }
    return null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf"
    );

    const validationError = validateFiles(files);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/conv/upload` ||
          "http://localhost:8000/conv/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.status !== 200) throw new Error("Failed to upload PDF");

      setPdfUploaded(true);
      setShowUploadZone(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Successfully uploaded ${files.length} file(s). Ready to process.`,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload PDF");
    } finally {
      setUploading(false);
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validationError = validateFiles(fileArray);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFiles(fileArray);
    await uploadFiles(fileArray);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const question = formData.get("question") as string;
    if (!question?.trim()) return;

    setLoading(true);
    setError(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question, timestamp: new Date() },
    ]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conv/ask` ||
          "http://localhost:8000/conv/ask",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ question }),
        }
      );

      if (!response.ok) throw new Error("Failed to get answer");

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, timestamp: new Date() },
      ]);

      (event.target as HTMLFormElement).reset();
      chatInputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conv/clear` ||
          "http://localhost:8000/conv/clear",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setMessages([]);
      setPdfUploaded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Loading PDF Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-lg font-semibold hover:text-blue-500 transition-colors"
                  >
                    <MountainIcon className="h-5 w-5" />
                    PDF Assistant
                  </Link>
                  <Link
                    href="/about"
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                    About
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>

            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-lg hover:text-blue-500 transition-colors"
            >
              <MountainIcon className="h-6 w-6" />
              PDF Assistant
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {pdfUploaded && (
              <Badge
                variant="secondary"
                className="hidden md:flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
              >
                <FileText className="h-3 w-3" />
                PDF Active
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="scrollbar container mx-auto p-4 max-w-5xl">
        <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader className="border-b px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                Chat with your PDF
              </CardTitle>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    onClick={clearHistory}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]" ref={scrollAreaRef}>
              <div className="space-y-6 p-6">
                {!pdfUploaded && !messages.length && (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20">
                      <Cloud className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold">No PDF uploaded yet</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload a PDF to start chatting about its contents
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-6 py-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                      {message.timestamp && (
                        <p
                          className={`text-xs mt-2 ${
                            message.role === "user"
                              ? "text-blue-100"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {error && (
              <Alert variant="destructive" className="mx-6 my-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="p-6 space-y-4 border-t bg-white dark:bg-gray-800">
              {showUploadZone && (
                <div
                  className={`absolute bottom-28 left-0 w-full h-40 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowUploadZone(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Uploading files...
                      </p>
                    </div>
                  ) : selectedFiles.length > 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <p className="text-sm font-medium">
                        {selectedFiles.length} file(s) selected
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedFiles.map((file) => file.name).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Cloud className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Drag and drop your PDF files here, or
                        </p>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          variant="link"
                          className="text-blue-500 hover:text-blue-600"
                        >
                          browse files
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Maximum file size: 10MB
                      </p>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  name="question"
                  placeholder={
                    pdfUploaded
                      ? "Ask about your PDF..."
                      : "Upload a PDF to start..."
                  }
                  disabled={!pdfUploaded || loading}
                  className="flex-1 focus-visible:ring-blue-500"
                  ref={chatInputRef}
                />
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                />

                <Button
                  onClick={() => setShowUploadZone(!showUploadZone)}
                  disabled={uploading || pdfUploaded}
                  className={`gap-2 ${!pdfUploaded ? "animate-pulse" : ""}`}
                  variant={pdfUploaded ? "outline" : "default"}
                  type="button"
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload</span>
                </Button>
                <Button
                  type="submit"
                  disabled={!pdfUploaded || loading}
                  className="gap-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
