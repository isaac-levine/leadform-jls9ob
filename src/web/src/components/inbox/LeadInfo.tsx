"use client"

import * as React from 'react';
import { format } from 'date-fns';
import { Lead, LeadStatus } from '../../types/lead.types';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

/**
 * Props interface for LeadInfo component
 * @version 1.0.0
 */
interface LeadInfoProps {
  lead: Lead;
  className?: string;
}

/**
 * Maps lead status to appropriate badge variant for visual indication
 * @param status - Current lead status
 * @returns Badge variant string
 */
const getStatusVariant = (status: LeadStatus): "default" | "success" | "warning" | "error" => {
  switch (status) {
    case LeadStatus.NEW:
      return "default";
    case LeadStatus.CONTACTED:
    case LeadStatus.ENGAGED:
      return "warning";
    case LeadStatus.NURTURING:
    case LeadStatus.CONVERTED:
      return "success";
    case LeadStatus.UNRESPONSIVE:
    case LeadStatus.CLOSED:
      return "error";
    default:
      return "default";
  }
};

/**
 * LeadInfo Component
 * 
 * Displays detailed lead information in a card format with enhanced accessibility
 * and responsive design. Built with Acetunity UI and ShadCN components.
 *
 * @param {LeadInfoProps} props - Component props
 * @returns {JSX.Element} Rendered lead information card
 * @version 1.0.0
 */
const LeadInfo: React.FC<LeadInfoProps> = ({ lead, className }) => {
  // Format dates for consistent display
  const createdDate = format(lead.createdAt, 'PPP');
  const lastContactedDate = format(lead.lastContactedAt, 'PPP p');
  const timeSinceCreated = format(lead.createdAt, 'relative');

  return (
    <Card 
      className={className}
      role="region"
      aria-label="Lead Information"
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Lead Details</h3>
          <Badge 
            variant={getStatusVariant(lead.status)}
            aria-label={`Lead status: ${lead.status}`}
          >
            {lead.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Created {timeSinceCreated}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Contact Information
          </h4>
          <div className="grid gap-2">
            <div className="flex items-center">
              <span className="text-sm font-medium w-24">Phone:</span>
              <a 
                href={`tel:${lead.phone}`}
                className="text-sm text-primary hover:underline"
                aria-label={`Phone number: ${lead.phone}`}
              >
                {lead.phone}
              </a>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium w-24">Status:</span>
              <span className="text-sm">{lead.status}</span>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Timeline
          </h4>
          <div className="grid gap-2">
            <div className="flex items-center">
              <span className="text-sm font-medium w-24">Created:</span>
              <time dateTime={lead.createdAt.toISOString()} className="text-sm">
                {createdDate}
              </time>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium w-24">Last Contact:</span>
              <time dateTime={lead.lastContactedAt.toISOString()} className="text-sm">
                {lastContactedDate}
              </time>
            </div>
          </div>
        </div>

        {/* Form Submission Data */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Form Submission Data
          </h4>
          <div className="grid gap-2 bg-muted p-3 rounded-md">
            {Object.entries(lead.data).map(([key, value]) => (
              <div key={key} className="flex items-start">
                <span className="text-sm font-medium w-24 capitalize">
                  {key}:
                </span>
                <span className="text-sm break-words flex-1">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Information */}
        {lead.notes && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Notes
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {lead.notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <Badge key={tag} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadInfo;