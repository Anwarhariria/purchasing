<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProcurementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item' => 'nullable|string',
            'applicant' => 'nullable|string',
            'need_by' => 'nullable|date|after_or_equal:+3 days',
            'needBy' => 'nullable|date|after_or_equal:+3 days',
            'deadline' => 'nullable|date|after_or_equal:+3 days',
        ];
    }

    public function messages(): array
    {
        return [
            'need_by.after_or_equal' => 'Tanggal kebutuhan praktikum (need-by date) minimal H-3 hari dari hari ini sesuai SOP pengadaan.',
            'needBy.after_or_equal' => 'Tanggal kebutuhan praktikum (need-by date) minimal H-3 hari dari hari ini sesuai SOP pengadaan.',
            'deadline.after_or_equal' => 'Tanggal tenggat praktikum minimal H-3 hari dari hari ini sesuai SOP pengadaan.',
        ];
    }
}
