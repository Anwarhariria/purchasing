<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Curriculum;
use Illuminate\Http\Request;

class CurriculumController extends Controller
{
    public function index(Request $request)
    {
        $curriculums = Curriculum::all();

        // If explicitly requested flat array
        if ($request->query('format') === 'flat') {
            return response()->json([
                'status' => 'success',
                'data' => $curriculums,
            ]);
        }

        // Default nested tree structure required by frontend:
        // { prodiName, semesters: [ { semester, courses: [ { courseName, menus: [ { id, menuName, ingredients } ] } ] } ] }
        $groupedByProdi = $curriculums->groupBy('prodi');
        $tree = [];

        foreach ($groupedByProdi as $prodiName => $prodiItems) {
            $semesters = [];
            $groupedBySem = $prodiItems->groupBy('semester');

            foreach ($groupedBySem as $semNum => $semItems) {
                $courses = [];
                $groupedByCourse = $semItems->groupBy('course');

                foreach ($groupedByCourse as $courseName => $courseItems) {
                    $menus = [];
                    foreach ($courseItems as $item) {
                        $menus[] = [
                            'id' => $item->id,
                            'menuName' => $item->menu_name,
                            'ingredients' => $item->ingredients,
                        ];
                    }
                    $courses[] = [
                        'courseName' => $courseName,
                        'menus' => $menus,
                    ];
                }

                $semesters[] = [
                    'semester' => (int)$semNum,
                    'courses' => $courses,
                ];
            }

            $tree[] = [
                'prodiName' => $prodiName,
                'semesters' => $semesters,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $tree,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isKaprodi() && !$user->isSuperAdmin())) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Kaprodi yang berhak menambahkan standar kurikulum dan resep praktik.',
            ], 403);
        }
        $request->validate([
            'prodi' => 'required|string',
            'semester' => 'required|integer',
            'course' => 'required|string',
            'menu_name' => 'required|string',
            'ingredients' => 'required|array',
        ]);

        $curriculum = Curriculum::create([
            'prodi' => $request->prodi,
            'semester' => $request->semester,
            'course' => $request->course,
            'menu_name' => $request->menu_name,
            'ingredients' => $request->ingredients,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Resep kurikulum berhasil ditambahkan.',
            'data' => $curriculum,
        ], 201);
    }
}
