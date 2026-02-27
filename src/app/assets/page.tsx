
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
        <Button className="font-headline font-bold w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      }
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets..." className="pl-9 w-full" />
        </div>
        <Button variant="outline" size="icon" className="shrink-0">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Card className="overflow-hidden border-2">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-headline font-bold whitespace-nowrap min-w-[150px]">Asset Name</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Park</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Category</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Condition</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Last Inspected</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ASSETS.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-accent/5 transition-colors">
                  <TableCell className="font-medium">
                    <div className="min-w-[120px]">
                      <div className="truncate max-w-[200px]">{asset.name}</div>
                      <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[200px]">{asset.location}</div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{asset.park}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline" className="font-normal text-[10px]">{asset.type}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge className={`${getConditionColor(asset.condition)} font-bold text-[10px]`} variant="outline">
                      {asset.condition}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[10px] whitespace-nowrap">{asset.lastInspected}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </DashboardShell>
  );
}
