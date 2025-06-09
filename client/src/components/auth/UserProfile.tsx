import React from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";

interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className }) => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-gray-600">
                User ID
              </label>
              <p className="text-sm">{user.id}</p>
            </div>
            {user.roles && user.roles.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Roles
                </label>
                <p className="text-sm">{user.roles.join(", ")}</p>
              </div>
            )}
          </div>

          <Button onClick={logout} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;

// const UserProfile: React.FC = () => {
//   const { user, logout } = useAuth();

//   if (!user) return null;

//   return (
//     <Card className="w-full max-w-md">
//       <CardHeader className="text-center">
//         <div className="flex justify-center mb-4">
//           <Avatar className="h-16 w-16">
//             <AvatarFallback className="bg-blue-500 text-white text-lg">
//               {user.name.charAt(0).toUpperCase()}
//             </AvatarFallback>
//           </Avatar>
//         </div>
//         <CardTitle className="text-xl">ยินดีต้อนรับ, {user.name}!</CardTitle>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <div className="space-y-2">
//           <div className="flex items-center gap-2">
//             <User className="h-4 w-4 text-gray-500" />
//             <span className="text-sm text-gray-600">ชื่อผู้ใช้:</span>
//             <span className="font-medium">{user.username}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-sm text-gray-600">ID:</span>
//             <span className="font-mono text-sm">{user.id}</span>
//           </div>
//         </div>
//         <Button
//           onClick={logout}
//           variant="outline"
//           className="w-full"
//         >
//           <LogOut className="mr-2 h-4 w-4" />
//           ออกจากระบบ
//         </Button>
//       </CardContent>
//     </Card>
//   );
// };

// export default UserProfile;
