export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          cpf: string | null
          created_at: string
          data_inicio: string
          id: string
          plano_id: string | null
          profile_id: string
          saldo_reposicoes: number
          status: Database["public"]["Enums"]["aluno_status"]
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_inicio?: string
          id?: string
          plano_id?: string | null
          profile_id: string
          saldo_reposicoes?: number
          status?: Database["public"]["Enums"]["aluno_status"]
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_inicio?: string
          id?: string
          plano_id?: string | null
          profile_id?: string
          saldo_reposicoes?: number
          status?: Database["public"]["Enums"]["aluno_status"]
        }
        Relationships: [
          {
            foreignKeyName: "alunos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          created_at: string
          destinatario: string
          id: string
          mensagem: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          destinatario?: string
          id?: string
          mensagem: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          destinatario?: string
          id?: string
          mensagem?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          updated_at?: string
          valor: Json
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      horarios_fixos: {
        Row: {
          aluno_id: string
          created_at: string
          dia_semana: number
          hora: string
          id: string
          professor_id: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          dia_semana: number
          hora: string
          id?: string
          professor_id?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          dia_semana?: number
          hora?: string
          id?: string
          professor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horarios_fixos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_fixos_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      observacoes_aluno: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          professor_id: string | null
          texto: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          professor_id?: string | null
          texto: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          professor_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "observacoes_aluno_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_aluno_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          aluno_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          forma: Database["public"]["Enums"]["pagamento_forma"] | null
          id: string
          mes_referencia: string
          status: Database["public"]["Enums"]["pagamento_status"]
          valor: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          forma?: Database["public"]["Enums"]["pagamento_forma"] | null
          id?: string
          mes_referencia: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          valor: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          forma?: Database["public"]["Enums"]["pagamento_forma"] | null
          id?: string
          mes_referencia?: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          frequencia_semanal: number
          id: string
          nome: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          frequencia_semanal: number
          id?: string
          nome: string
          valor: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          frequencia_semanal?: number
          id?: string
          nome?: string
          valor?: number
        }
        Relationships: []
      }
      presencas: {
        Row: {
          aluno_id: string
          created_at: string
          data: string
          hora: string
          id: string
          observacao: string | null
          professor_id: string | null
          status: Database["public"]["Enums"]["presenca_status"]
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data: string
          hora: string
          id?: string
          observacao?: string | null
          professor_id?: string | null
          status: Database["public"]["Enums"]["presenca_status"]
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data?: string
          hora?: string
          id?: string
          observacao?: string | null
          professor_id?: string | null
          status?: Database["public"]["Enums"]["presenca_status"]
        }
        Relationships: [
          {
            foreignKeyName: "presencas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      professores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          profile_id: string
          turno: Database["public"]["Enums"]["turno"]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          profile_id: string
          turno?: Database["public"]["Enums"]["turno"]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          turno?: Database["public"]["Enums"]["turno"]
        }
        Relationships: [
          {
            foreignKeyName: "professores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contato_emergencia: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          contato_emergencia?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          contato_emergencia?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reposicoes: {
        Row: {
          aluno_id: string
          created_at: string
          data_agendada: string | null
          data_origem: string | null
          expira_em: string
          hora_agendada: string | null
          id: string
          status: Database["public"]["Enums"]["reposicao_status"]
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_agendada?: string | null
          data_origem?: string | null
          expira_em?: string
          hora_agendada?: string | null
          id?: string
          status?: Database["public"]["Enums"]["reposicao_status"]
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_agendada?: string | null
          data_origem?: string | null
          expira_em?: string
          hora_agendada?: string | null
          id?: string
          status?: Database["public"]["Enums"]["reposicao_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reposicoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      aluno_status: "ativo" | "suspenso" | "cancelado"
      app_role: "admin" | "professor" | "aluno"
      pagamento_forma: "pix" | "cartao" | "dinheiro"
      pagamento_status: "pago" | "pendente" | "atrasado"
      presenca_status:
        | "presente"
        | "falta_justificada"
        | "falta_nao_justificada"
        | "reposicao"
      reposicao_status: "pendente" | "realizada" | "expirada" | "cancelada"
      turno: "manha" | "tarde" | "noite"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      aluno_status: ["ativo", "suspenso", "cancelado"],
      app_role: ["admin", "professor", "aluno"],
      pagamento_forma: ["pix", "cartao", "dinheiro"],
      pagamento_status: ["pago", "pendente", "atrasado"],
      presenca_status: [
        "presente",
        "falta_justificada",
        "falta_nao_justificada",
        "reposicao",
      ],
      reposicao_status: ["pendente", "realizada", "expirada", "cancelada"],
      turno: ["manha", "tarde", "noite"],
    },
  },
} as const
