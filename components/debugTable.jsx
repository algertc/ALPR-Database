"use client";

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getLatestPlateReads } from '@/actions';

export default function PlateTable({ initialData }) {
  // Initialize with the data directly since it's an array
  const [data, setData] = useState(initialData || []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    if (page === 1 && !search && initialData) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getLatestPlateReads({
          page,
          pageSize,
          search
        });
        setData(result || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setData([]);
      }
      setLoading(false);
    };

    loadData();
  }, [search, page, initialData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Search className="text-gray-400" />
        <Input
          placeholder="Search plates..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate Number</TableHead>
              <TableHead>Occurrences</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              data.map((plate) => (
                <TableRow key={plate.id}>
                  <TableCell>{plate.plate_number}</TableCell>
                  <TableCell>{plate.occurrence_count}</TableCell>
                  <TableCell>{plate.known_name || '-'}</TableCell>
                  <TableCell>{plate.notes || '-'}</TableCell>
                  <TableCell>{new Date(plate.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => setPage(p => p + 1)}
          disabled={data.length < pageSize || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}