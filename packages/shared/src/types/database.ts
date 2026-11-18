
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "addresses": {
                  Row: {
                    "created_at": string,"directions": string | null,"ext_number": string | null,"id": string,"int_number": string | null,"is_default": boolean,"label": string | null,"location": unknown,"municipality": string,"neighborhood": string | null,"postal_code": string,"state": string,"street": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"directions"?: string | null,"ext_number"?: string | null,"id"?: string,"int_number"?: string | null,"is_default"?: boolean,"label"?: string | null,"location": unknown,"municipality": string,"neighborhood"?: string | null,"postal_code": string,"state": string,"street": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"directions"?: string | null,"ext_number"?: string | null,"id"?: string,"int_number"?: string | null,"is_default"?: boolean,"label"?: string | null,"location"?: unknown,"municipality"?: string,"neighborhood"?: string | null,"postal_code"?: string,"state"?: string,"street"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "addresses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "addresses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "icon": string | null,"id": number,"is_active": boolean,"name": string,"parent_id": number | null,"requires_background_check": boolean,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "icon"?: string | null,"id"?: number,"is_active"?: boolean,"name": string,"parent_id"?: number | null,"requires_background_check"?: boolean,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "icon"?: string | null,"id"?: number,"is_active"?: boolean,"name"?: string,"parent_id"?: number | null,"requires_background_check"?: boolean,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"category_keywords": {
                  Row: {
                    "category_id": number,"term": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"term": string
                  }
                  Update: {
                    "category_id"?: number,"term"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "category_keywords_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"client_favorites": {
                  Row: {
                    "client_id": string,"created_at": string,"provider_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"provider_id": string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"provider_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_favorites_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_favorites_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_favorites_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string | null,"created_at": string,"duration_s": number | null,"id": string,"lat": number | null,"lng": number | null,"media_url": string | null,"read_at": string | null,"request_id": string,"sender_id": string,"type": Database["public"]['Enums']["message_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"duration_s"?: number | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"media_url"?: string | null,"read_at"?: string | null,"request_id": string,"sender_id": string,"type"?: Database["public"]['Enums']["message_type"]
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"duration_s"?: number | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"media_url"?: string | null,"read_at"?: string | null,"request_id"?: string,"sender_id"?: string,"type"?: Database["public"]['Enums']["message_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "client_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "provider_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"deleted_at": string | null,"email": string | null,"full_name": string,"id": string,"is_admin": boolean,"phone": string | null,"terms_accepted_at": string | null,"terms_version": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"email"?: string | null,"full_name": string,"id": string,"is_admin"?: boolean,"phone"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"is_admin"?: boolean,"phone"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"provider_availability": {
                  Row: {
                    "end_time": string,"provider_id": string,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "end_time": string,"provider_id": string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "end_time"?: string,"provider_id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_availability_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"provider_credentials": {
                  Row: {
                    "created_at": string,"id": string,"institution": string | null,"provider_id": string,"reviewed_at": string | null,"status": Database["public"]['Enums']["verification_status"],"storage_path": string | null,"title": string,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"institution"?: string | null,"provider_id": string,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"storage_path"?: string | null,"title": string,"year"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"institution"?: string | null,"provider_id"?: string,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"storage_path"?: string | null,"title"?: string,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_credentials_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"provider_media": {
                  Row: {
                    "caption": string | null,"id": string,"provider_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"id"?: string,"provider_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "caption"?: string | null,"id"?: string,"provider_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_media_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"provider_profiles": {
                  Row: {
                    "avg_response_minutes": number | null,"base_location": unknown,"bio": string | null,"created_at": string,"headline": string | null,"is_available": boolean,"jobs_completed": number,"payment_methods": (Database["public"]['Enums']["payment_method"])[],"rating_avg": number,"rating_count": number,"service_radius_km": number,"user_id": string,"verification_status": Database["public"]['Enums']["verification_status"],"verified_at": string | null,"years_experience": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avg_response_minutes"?: number | null,"base_location": unknown,"bio"?: string | null,"created_at"?: string,"headline"?: string | null,"is_available"?: boolean,"jobs_completed"?: number,"payment_methods"?: (Database["public"]['Enums']["payment_method"])[],"rating_avg"?: number,"rating_count"?: number,"service_radius_km"?: number,"user_id": string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"years_experience"?: number | null
                  }
                  Update: {
                    "avg_response_minutes"?: number | null,"base_location"?: unknown,"bio"?: string | null,"created_at"?: string,"headline"?: string | null,"is_available"?: boolean,"jobs_completed"?: number,"payment_methods"?: (Database["public"]['Enums']["payment_method"])[],"rating_avg"?: number,"rating_count"?: number,"service_radius_km"?: number,"user_id"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"years_experience"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_services": {
                  Row: {
                    "category_id": number,"description": string | null,"id": string,"is_active": boolean,"price_mxn": number | null,"price_type": Database["public"]['Enums']["price_type"],"provider_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"description"?: string | null,"id"?: string,"is_active"?: boolean,"price_mxn"?: number | null,"price_type": Database["public"]['Enums']["price_type"],"provider_id": string,"title": string
                  }
                  Update: {
                    "category_id"?: number,"description"?: string | null,"id"?: string,"is_active"?: boolean,"price_mxn"?: number | null,"price_type"?: Database["public"]['Enums']["price_type"],"provider_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_services_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_services_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"provider_unavailability": {
                  Row: {
                    "all_day": boolean,"created_at": string,"ends_at": string,"id": string,"provider_id": string,"reason": string | null,"rrule": string | null,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"created_at"?: string,"ends_at": string,"id"?: string,"provider_id": string,"reason"?: string | null,"rrule"?: string | null,"starts_at": string
                  }
                  Update: {
                    "all_day"?: boolean,"created_at"?: string,"ends_at"?: string,"id"?: string,"provider_id"?: string,"reason"?: string | null,"rrule"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_unavailability_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"push_tokens": {
                  Row: {
                    "platform": string,"token": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "platform": string,"token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "platform"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"reason": string,"reporter_id": string,"request_id": string | null,"status": string,"target_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reporter_id": string,"request_id"?: string | null,"status"?: string,"target_user_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string,"request_id"?: string | null,"status"?: string,"target_user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "client_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "provider_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"request_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"from_status": Database["public"]['Enums']["request_status"] | null,"id": number,"note": string | null,"request_id": string,"to_status": Database["public"]['Enums']["request_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["request_status"] | null,"id"?: number,"note"?: string | null,"request_id": string,"to_status": Database["public"]['Enums']["request_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["request_status"] | null,"id"?: number,"note"?: string | null,"request_id"?: string,"to_status"?: Database["public"]['Enums']["request_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_events_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "client_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_events_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "provider_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_events_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"request_media": {
                  Row: {
                    "duration_s": number | null,"id": string,"kind": Database["public"]['Enums']["media_kind"],"request_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "duration_s"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["media_kind"],"request_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "duration_s"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"request_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_media_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "client_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_media_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "provider_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_media_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"review_media": {
                  Row: {
                    "id": string,"review_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"review_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "id"?: string,"review_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_media_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "comment": string | null,"created_at": string,"id": string,"is_public": boolean,"rating": number,"request_id": string,"reviewee_id": string,"reviewer_id": string,"tags": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"is_public"?: boolean,"rating": number,"request_id": string,"reviewee_id": string,"reviewer_id": string,"tags"?: (string)[]
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"is_public"?: boolean,"rating"?: number,"request_id"?: string,"reviewee_id"?: string,"reviewer_id"?: string,"tags"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "client_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "provider_request_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"service_requests": {
                  Row: {
                    "address_id": string,"cancel_note": string | null,"cancel_reason": Database["public"]['Enums']["cancel_reason_t"] | null,"cancelled_at": string | null,"cancelled_by": string | null,"category_id": number,"client_id": string,"created_at": string,"description": string,"expires_at": string,"final_price_mxn": number | null,"id": string,"preferred_dates": (string)[],"preferred_payment_methods": (Database["public"]['Enums']["payment_method"])[],"provider_id": string,"quoted_price_mxn": number | null,"scheduled_at": string | null,"service_id": string | null,"status": Database["public"]['Enums']["request_status"],"time_windows": (string)[],"updated_at": string,"urgency": Database["public"]['Enums']["urgency_level"],"viewed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id": string,"cancel_note"?: string | null,"cancel_reason"?: Database["public"]['Enums']["cancel_reason_t"] | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"category_id": number,"client_id": string,"created_at"?: string,"description": string,"expires_at"?: string,"final_price_mxn"?: number | null,"id"?: string,"preferred_dates"?: (string)[],"preferred_payment_methods"?: (Database["public"]['Enums']["payment_method"])[],"provider_id": string,"quoted_price_mxn"?: number | null,"scheduled_at"?: string | null,"service_id"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"time_windows"?: (string)[],"updated_at"?: string,"urgency"?: Database["public"]['Enums']["urgency_level"],"viewed_at"?: string | null
                  }
                  Update: {
                    "address_id"?: string,"cancel_note"?: string | null,"cancel_reason"?: Database["public"]['Enums']["cancel_reason_t"] | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"category_id"?: number,"client_id"?: string,"created_at"?: string,"description"?: string,"expires_at"?: string,"final_price_mxn"?: number | null,"id"?: string,"preferred_dates"?: (string)[],"preferred_payment_methods"?: (Database["public"]['Enums']["payment_method"])[],"provider_id"?: string,"quoted_price_mxn"?: number | null,"scheduled_at"?: string | null,"service_id"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"time_windows"?: (string)[],"updated_at"?: string,"urgency"?: Database["public"]['Enums']["urgency_level"],"viewed_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_requests_address_id_fkey"
      columns: ["address_id"]
isOneToOne: false
      referencedRelation: "addresses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "service_requests_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "provider_services"
      referencedColumns: ["id"]
    }
                  ]
                },"verification_documents": {
                  Row: {
                    "created_at": string,"doc_type": string,"id": string,"kyc_reference": string | null,"notes": string | null,"provider_id": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["verification_status"],"storage_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doc_type": string,"id"?: string,"kyc_reference"?: string | null,"notes"?: string | null,"provider_id": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"storage_path"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"doc_type"?: string,"id"?: string,"kyc_reference"?: string | null,"notes"?: string | null,"provider_id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"storage_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_documents_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "verification_documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "client_request_view": {
                  Row: {
                    "id": string | null,"provider_id": string | null,"provider_name": string | null,"provider_phone": string | null,"quoted_price_mxn": number | null,"scheduled_at": string | null,"status": Database["public"]['Enums']["request_status"] | null,"viewed_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "service_requests_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"provider_request_view": {
                  Row: {
                    "client_phone": string | null,"description": string | null,"id": string | null,"municipality": string | null,"neighborhood": string | null,"preferred_dates": (string)[] | null,"preferred_payment_methods": (Database["public"]['Enums']["payment_method"])[] | null,"status": Database["public"]['Enums']["request_status"] | null,"street": string | null,"time_windows": (string)[] | null,"urgency": Database["public"]['Enums']["urgency_level"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"public_profiles": {
                  Row: {
                    "avatar_url": string | null,"full_name": string | null,"id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "avatar_url"?: string | null,"full_name"?: string | null,"id"?: string | null
                         }
                        Update: {
                           "avatar_url"?: string | null,"full_name"?: string | null,"id"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "expire_requests":
{ Args: Record<PropertyKey, never>; Returns: {
              "address_id": string,
"cancel_note": string | null,
"cancel_reason": Database["public"]['Enums']["cancel_reason_t"] | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"category_id": number,
"client_id": string,
"created_at": string,
"description": string,
"expires_at": string,
"final_price_mxn": number | null,
"id": string,
"preferred_dates": (string)[],
"preferred_payment_methods": (Database["public"]['Enums']["payment_method"])[],
"provider_id": string,
"quoted_price_mxn": number | null,
"scheduled_at": string | null,
"service_id": string | null,
"status": Database["public"]['Enums']["request_status"],
"time_windows": (string)[],
"updated_at": string,
"urgency": Database["public"]['Enums']["urgency_level"],
"viewed_at": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "service_requests"
        isOneToOne: false
        isSetofReturn: true
      } },
"home_favorites":
{ Args: Record<PropertyKey, never>; Returns: {
              "provider_id": string,"reason": string
            }[]
                           },
"is_request_participant":
{ Args: { "p_folder": string }; Returns: boolean
                           },
"mark_messages_read":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"mark_request_viewed":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"match_categories":
{ Args: { "p_text": string }; Returns: {
              "category_id": number,"name": string,"score": number,"slug": string
            }[]
                           },
"provider_busy_days":
{ Args: { "p_from": string,"p_provider": string,"p_to": string }; Returns: {
              "all_day": boolean,"day": string
            }[]
                           },
"search_providers":
{ Args: { "p_category": number,"p_lat": number,"p_lng": number,"p_max_km"?: number }; Returns: {
              "distance_km": number,"from_price_mxn": number,"full_name": string,"headline": string,"provider_id": string,"rating_avg": number,"rating_count": number
            }[]
                           },
"transition_request":
{ Args: { "p_cancel_reason"?: Database["public"]['Enums']["cancel_reason_t"],"p_note"?: string,"p_quoted_price"?: number,"p_request_id": string,"p_scheduled_at"?: string,"p_to": Database["public"]['Enums']["request_status"] }; Returns: {
              "address_id": string,
"cancel_note": string | null,
"cancel_reason": Database["public"]['Enums']["cancel_reason_t"] | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"category_id": number,
"client_id": string,
"created_at": string,
"description": string,
"expires_at": string,
"final_price_mxn": number | null,
"id": string,
"preferred_dates": (string)[],
"preferred_payment_methods": (Database["public"]['Enums']["payment_method"])[],
"provider_id": string,
"quoted_price_mxn": number | null,
"scheduled_at": string | null,
"service_id": string | null,
"status": Database["public"]['Enums']["request_status"],
"time_windows": (string)[],
"updated_at": string,
"urgency": Database["public"]['Enums']["urgency_level"],
"viewed_at": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "service_requests"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "cancel_reason_t": "resolved"|"other_provider"|"schedule"|"price"|"other","media_kind": "image"|"video","message_type": "text"|"image"|"video"|"audio"|"location","payment_method": "cash"|"card"|"transfer","price_type": "fixed"|"hourly"|"quote","request_status": "pending"|"accepted"|"declined"|"scheduled"|"in_progress"|"completed"|"cancelled"|"expired","urgency_level": "urgent"|"this_week"|"flexible","verification_status": "unverified"|"pending"|"verified"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cancel_reason_t": ["resolved", "other_provider", "schedule", "price", "other"],"media_kind": ["image", "video"],"message_type": ["text", "image", "video", "audio", "location"],"payment_method": ["cash", "card", "transfer"],"price_type": ["fixed", "hourly", "quote"],"request_status": ["pending", "accepted", "declined", "scheduled", "in_progress", "completed", "cancelled", "expired"],"urgency_level": ["urgent", "this_week", "flexible"],"verification_status": ["unverified", "pending", "verified", "rejected"]
          }
        }
} as const
