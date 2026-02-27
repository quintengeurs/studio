
"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import { MOCK_ASSETS } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

export default function AssetRegister() {
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'bg-primary text-primary-foreground';
      case 'Good': return 'bg-accent text-accent-foreground';
      case 'Fair': return 'bg-secondary text-secondary-foreground';
      case 'Poor': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      default: return '';
    }
  };

  return (
    <DashboardShell 
      title="Asset Register" 
      description="Comprehensive inventory of Hackney parks infrastructure"
      actions={
        <Button className="font-headline font-bold">
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      }
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-headline font-bold">Asset Name</TableHead>
              <TableHead className="font-headline font-bold">Park</TableHead>
              <TableHead className="font-headline font-bold">Category</TableHead>
              <TableHead className="font-headline font-bold">Condition</TableHead>
              <TableHead className="font-headline font-bold">Last Inspected</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_ASSETS.map((asset) => (
              <TableRow key={asset.id} className="hover:bg-accent/5 transition-colors">
                <TableCell className="font-medium">
                  <div>
                    {asset.name}
                    <div className="text-xs text-muted-foreground font-normal">{asset.location}</div>
                  </div>
                </TableCell>
                <TableCell>{asset.park}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">{asset.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getConditionColor(asset.condition)} variant="outline">
                    {asset.condition}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{asset.lastInspected}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </DashboardShell>
  );
}
