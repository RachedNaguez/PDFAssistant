"use client";
import { useContext } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageCircle, FileText, ArrowRight, Lock, Unlock } from "lucide-react";
import AuthContext from "./context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const handleChatClick = () => {
    if (user) {
      router.push("/chat");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-16">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6">
          PDF Assistant
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Your intelligent companion for analyzing and discussing PDF documents
        </p>
        
        {/* Main Card */}
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              Start a Conversation
            </CardTitle>
            <CardDescription>
              Upload your PDF and start chatting instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">PDF Analysis</h3>
                      <p className="text-sm text-gray-600">
                        Upload and analyze any PDF document with advanced AI
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      {user ? (
                        <Unlock className="w-6 h-6 text-green-600" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">
                        {user ? "Ready to Chat" : "Login Required"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {user
                          ? "You're logged in and ready to start chatting"
                          : "Login to start analyzing your documents"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                className="group"
                onClick={handleChatClick}
              >
                <span className="mr-2">
                  {user ? "Start Chatting" : "Login to Chat"}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}