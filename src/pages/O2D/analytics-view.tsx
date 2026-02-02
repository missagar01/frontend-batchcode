"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Loader2, TrendingUp, DollarSign, Activity } from "lucide-react"
import api, { API_ENDPOINTS } from "../../config/api"

type AnalyticItem = {
    ITEM: string
    AVERAGE: number
}

type AnalyticsData = {
    allSaudaAverage: AnalyticItem[]
    currentMonthSalesAverage: AnalyticItem[]
    saudaAverageRate: number
    lastUpdated: string
}

export function AnalyticsView() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await api.get(API_ENDPOINTS.O2D.DASHBOARD.METRICS)
            if (response.data?.success) {
                setData(response.data.data)
            } else {
                throw new Error("Failed to load analytics data")
            }
        } catch (err: any) {
            console.error("Error fetching analytics:", err)
            setError(err.message || "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[500px] text-red-500">
                <p>Error: {error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4 md:p-6 animate-in fade-in-50">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
                <p className="text-muted-foreground">
                    Live financial and operational metrics from Oracle DB.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* KPI Card for Sauda Average Rate */}
                <Card className="md:col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-blue-100 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Sauda Average Rate
                        </CardTitle>
                        <CardDescription className="text-blue-200">
                            PM Division (From 01-Jan-2026)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">
                            ₹ {data?.saudaAverageRate?.toLocaleString() ?? 0}
                        </div>
                    </CardContent>
                </Card>

                {/* Placeholder for future stats or spacing */}
                <div className="md:col-span-2 hidden md:block"></div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* All Sauda Average Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-indigo-500" />
                            All Sauda Average
                        </CardTitle>
                        <CardDescription>
                            Weighted average rates by Item Category (Open Orders)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Average Rate</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.allSaudaAverage?.map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{item.ITEM}</TableCell>
                                        <TableCell className="text-right font-bold text-indigo-600">
                                            ₹ {item.AVERAGE?.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!data?.allSaudaAverage?.length && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                                            No data available
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Current Month Sales Average Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            Current Month Sales Average
                        </CardTitle>
                        <CardDescription>
                            Average Tax/Qty (Since 01-Jan-2026)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Average Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.currentMonthSalesAverage?.map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{item.ITEM}</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">
                                            ₹ {item.AVERAGE?.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!data?.currentMonthSalesAverage?.length && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                                            No data available
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
