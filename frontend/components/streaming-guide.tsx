'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Radio, 
  Users, 
  Settings, 
  Play, 
  Eye, 
  MessageCircle,
  Camera,
  Monitor,
  ArrowRight
} from "lucide-react";

interface StreamingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StreamingGuide({ isOpen, onClose }: StreamingGuideProps) {
  if (!isOpen) return null;

  const steps = [
    {
      title: "Create Stream",
      description: "Set up your stream with title, description, and thumbnail",
      icon: <Camera className="w-6 h-6" />,
      actions: ["Add title & description", "Upload thumbnail", "Choose category", "Set privacy"]
    },
    {
      title: "Go Live",
      description: "Start broadcasting with camera or screen share",
      icon: <Radio className="w-6 h-6" />,
      actions: ["Camera auto-opens", "Toggle screen share", "Monitor viewer count", "Interact via chat"]
    },
    {
      title: "Manage Stream",
      description: "Control your broadcast and engagement",
      icon: <Settings className="w-6 h-6" />,
      actions: ["Mute/unmute audio", "Turn camera on/off", "End stream", "Delete if needed"]
    },
    {
      title: "View & Share",
      description: "Others can watch and chat in real-time",
      icon: <Eye className="w-6 h-6" />,
      actions: ["Real-time video", "Live chat", "View count", "Share stream link"]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Radio className="w-6 h-6 text-error-600" />
            How Live Streaming Works
          </CardTitle>
          <p className="text-neutral-600">Everything you need to know about streaming</p>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Flow Steps */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="h-full border-2 hover:border-primary-300 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                      {step.icon}
                    </div>
                    <h3 className="font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-neutral-600 mb-4">{step.description}</p>
                    <div className="space-y-1">
                      {step.actions.map((action, actionIndex) => (
                        <div key={actionIndex} className="text-xs bg-neutral-100 rounded px-2 py-1">
                          {action}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Arrow */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Navigation */}
          <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-4 text-center">Quick Navigation</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-primary-200">
                <CardContent className="p-4 text-center">
                  <Play className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                  <h4 className="font-semibold">Watch Streams</h4>
                  <p className="text-sm text-neutral-600 mb-3">Browse and join live content</p>
                  <Badge variant="outline">Main /live page</Badge>
                </CardContent>
              </Card>
              
              <Card className="border-success-200">
                <CardContent className="p-4 text-center">
                  <Radio className="w-8 h-8 text-success-600 mx-auto mb-2" />
                  <h4 className="font-semibold">Start Streaming</h4>
                  <p className="text-sm text-neutral-600 mb-3">Create and broadcast live</p>
                  <Badge variant="outline">Go Live button</Badge>
                </CardContent>
              </Card>
              
              <Card className="border-purple-200">
                <CardContent className="p-4 text-center">
                  <Settings className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-semibold">Manage Streams</h4>
                  <p className="text-sm text-neutral-600 mb-3">Edit, delete, and monitor</p>
                  <Badge variant="outline">My Streams page</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-lg mb-3 text-success-600">✨ Host Features</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-success-600" />
                  Camera auto-starts when going live
                </li>
                <li className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-success-600" />
                  Screen sharing with one click
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-success-600" />
                  Real-time chat with viewers
                </li>
                <li className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-success-600" />
                  Live viewer count display
                </li>
                <li className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-success-600" />
                  Stream controls (mute, camera, end)
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-3 text-primary-600">👥 Viewer Features</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary-600" />
                  Watch live video/screen share
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary-600" />
                  Chat with host and other viewers
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-600" />
                  See viewer count and activity
                </li>
                <li className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary-600" />
                  Browse live, scheduled, and past streams
                </li>
                <li className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary-600" />
                  Join any live stream instantly
                </li>
              </ul>
            </div>
          </div>

          {/* Close Button */}
          <div className="text-center pt-4">
            <Button onClick={onClose} size="lg" className="gap-2">
              Got it! Let's Stream
              <Radio className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
